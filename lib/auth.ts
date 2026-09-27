import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DEFAULT_USER_POINTS } from "@/lib/constants/points";
import { prisma } from "@/lib/prisma";
import {
  displayNameSchema,
  emailSchema,
  passwordSchema,
} from "@/lib/validation";
import { prismaErrorCode } from "@/server/points";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

/** 認証エラーはそのままログイン画面に表示される */
class AuthError extends Error {}

async function authorize(credentials: Record<string, string> | undefined) {
  const mode = credentials?.mode === "register" ? "register" : "login";
  const email = emailSchema.safeParse(credentials?.email);
  if (!email.success) throw new AuthError(email.error.issues[0].message);
  const password = passwordSchema.safeParse(credentials?.password ?? "");
  if (!password.success) throw new AuthError(password.error.issues[0].message);

  // 旧データでは大文字を含むメールアドレスが残っている場合があるので、入力どおりの形でも探す
  const typed = credentials?.email?.trim() ?? "";
  const user =
    (await prisma.user.findUnique({ where: { email: email.data } })) ??
    (typed !== email.data
      ? await prisma.user.findUnique({ where: { email: typed } })
      : null);

  if (mode === "login") {
    if (!user) {
      throw new AuthError("このメールアドレスは登録されていません");
    }
    if (!user.passwordHash) {
      throw new AuthError(
        "パスワードが未設定のアカウントです。管理者にパスワードの設定を依頼してください",
      );
    }
    const ok = await bcrypt.compare(password.data, user.passwordHash);
    if (!ok) throw new AuthError("メールアドレスかパスワードが違います");
    return { id: user.id, email: user.email, name: user.name };
  }

  const name = displayNameSchema.safeParse(credentials?.name ?? "");
  if (!name.success) throw new AuthError(name.error.issues[0].message);
  // 本人確認の手段が無いので、既存アカウント（パスワード未設定の旧アカウントを含む）は引き継がない
  if (user) {
    throw new AuthError("このメールアドレスはすでに登録されています");
  }
  const passwordHash = await hashPassword(password.data);
  let saved: { id: string; email: string | null; name: string | null };
  try {
    saved = await prisma.user.create({
      data: {
        email: email.data,
        name: name.data,
        passwordHash,
        points: DEFAULT_USER_POINTS,
      },
    });
  } catch (error) {
    // 同じメールアドレスで同時に登録された場合
    if (prismaErrorCode(error) === "P2002") {
      throw new AuthError("このメールアドレスはすでに登録されています");
    }
    throw error;
  }
  return { id: saved.id, email: saved.email, name: saved.name };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        mode: { type: "text" },
        email: { type: "email" },
        password: { type: "password" },
        name: { type: "text" },
      },
      async authorize(credentials) {
        try {
          return await authorize(credentials);
        } catch (error) {
          if (error instanceof AuthError) throw error;
          // DB エラーなどの内部情報は画面に出さない
          console.error("Auth error:", error);
          throw new Error(
            "ただいまログインできません。時間をおいて試してください",
          );
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

/** セッションがあり、かつ DB 上にユーザーが存在するときだけ ID を返す */
export async function getCurrentUserId() {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  return user?.id ?? null;
}
