import path from "node:path";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * SQLite の相対パス（file:./dev.db）を、Prisma CLI と同じく
 * prisma/ ディレクトリ基準の絶対パスに直す。
 * これをしないと CLI が作った DB と実行時に開く DB がずれる。
 */
export function resolveDatabaseUrl(url: string | undefined) {
  if (!url?.startsWith("file:")) return url;
  const file = url.slice("file:".length);
  if (path.isAbsolute(file)) return url;
  return `file:${path.join(/*turbopackIgnore: true*/ process.cwd(), "prisma", file)}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(process.env.DATABASE_URL),
    log: process.env.PRISMA_LOG_QUERIES
      ? ["query", "error", "warn"]
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
