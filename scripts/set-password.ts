/**
 * パスワード未設定の旧アカウントなどに、管理者がパスワードを設定する。
 *   npm run user:set-password -- <email> <new-password>
 */
import "dotenv/config";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error(
      "使い方: npm run user:set-password -- <email> <new-password>",
    );
    process.exit(1);
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    console.error(parsed.error.issues[0].message);
    process.exit(1);
  }
  const user =
    (await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })) ?? (await prisma.user.findUnique({ where: { email: email.trim() } }));
  if (!user) {
    console.error(`ユーザーが見つかりません: ${email}`);
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data) },
  });
  console.log(`パスワードを設定しました: ${user.email}`);
}

main().finally(() => prisma.$disconnect());
