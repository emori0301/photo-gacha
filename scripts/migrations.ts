import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Client } from "@libsql/client";

/**
 * prisma/migrations の SQL のうち、まだ当てていないものを古い順に当てる。
 * Prisma の migrate deploy は Turso に直接つなげないので自前で行う。
 * 記録には Prisma と同じ _prisma_migrations テーブルを使う。
 */
export async function applyMigrations(client: Client, dir: string) {
  await client.execute(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
  )`);
  const { rows } = await client.execute(
    `SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"`,
  );
  // 途中で失敗したものがあると、その先は DB の状態が読めないので止める
  const failed = rows.find(
    (row) => row.finished_at === null && row.rolled_back_at === null,
  );
  if (failed) {
    throw new Error(
      `途中で失敗したマイグレーションがあります: ${failed.migration_name}`,
    );
  }
  const done = new Set(
    rows
      .filter((row) => row.finished_at !== null)
      .map((row) => String(row.migration_name)),
  );

  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const applied: string[] = [];
  for (const name of names) {
    if (done.has(name)) continue;
    const sql = await readFile(path.join(dir, name, "migration.sql"), "utf8");
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at") VALUES (?, ?, ?, ?)`,
      args: [
        id,
        createHash("sha256").update(sql).digest("hex"),
        name,
        Date.now(),
      ],
    });
    try {
      await client.executeMultiple(sql);
    } catch (error) {
      await client.execute({
        sql: `UPDATE "_prisma_migrations" SET "logs" = ? WHERE "id" = ?`,
        args: [String(error), id],
      });
      throw new Error(`${name} を当てられませんでした: ${error}`);
    }
    await client.execute({
      sql: `UPDATE "_prisma_migrations" SET "finished_at" = ?, "applied_steps_count" = 1 WHERE "id" = ?`,
      args: [Date.now(), id],
    });
    applied.push(name);
  }
  return applied;
}
