import path from "node:path";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { databaseEnv } from "@/lib/database-env";
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

/** 手元では SQLite のファイル（file:...）、公開先では Turso（libsql://...）に、同じ libSQL のアダプターでつなぐ */
function createPrismaClient() {
  const env = databaseEnv();
  const url = resolveDatabaseUrl(env.url);
  if (!url) throw new Error("DATABASE_URL が設定されていません");
  return new PrismaClient({
    adapter: new PrismaLibSQL({ url, authToken: env.authToken }),
    log: process.env.PRISMA_LOG_QUERIES
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
