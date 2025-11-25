import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  // CredentialsProviderを使う場合はAdapterは不要（JWT戦略を使用）
  // adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        try {
          // 簡易的な認証（デモ用）
          let user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            // ユーザーが存在しない場合は新規作成（デフォルト10ポイント）
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.name || credentials.email.split("@")[0],
                points: 10, // デフォルト10ポイント
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
