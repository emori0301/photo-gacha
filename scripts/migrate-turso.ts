/**
 * 公開先のデータベース（Turso）にテーブルを作る・更新する。
 * Vercel ではデプロイのたびに自動で実行される（vercel.json の buildCommand）。
 *   npm run db:migrate:turso
 * 手元の SQLite ファイルには npm run db:migrate を使う。
 */
import "dotenv/config";
import path from "node:path";
import { createClient } from "@libsql/client";
import { databaseEnv } from "../lib/database-env";
import { applyMigrations } from "./migrations";

async function main() {
  const { url, authToken } = databaseEnv();
  if (!url || url.startsWith("file:")) {
    console.error(
      "Turso のデータベースがつながっていません。Vercel の Storage で Turso をこのプロジェクトにつなぐか、DATABASE_URL に libsql://... を設定してください（手元の SQLite は npm run db:migrate）",
    );
    process.exit(1);
  }
  const client = createClient({ url, authToken });
  try {
    const applied = await applyMigrations(
      client,
      path.join(__dirname, "..", "prisma", "migrations"),
    );
    console.log(
      applied.length
        ? `データベースを更新しました: ${applied.join(", ")}`
        : "データベースは最新です",
    );
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
