import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Client, createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { applyMigrations } from "@/scripts/migrations";

const MIGRATIONS = path.join(__dirname, "..", "prisma", "migrations");

/** テーブル・インデックスの定義（記録用テーブルを除く） */
async function schemaOf(client: Client) {
  const { rows } = await client.execute(
    `SELECT type, name, sql FROM sqlite_master
     WHERE name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
     ORDER BY type, name`,
  );
  return rows.map((row) => [row.type, row.name, row.sql]);
}

describe("applyMigrations（Turso 用）", () => {
  let dir: string;
  let client: Client;

  afterEach(() => {
    client?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("prisma migrate deploy と同じテーブルを作り、2 回目は何もしない", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "photogacha-migrate-"));
    client = createClient({ url: `file:${path.join(dir, "turso.db")}` });

    const first = await applyMigrations(client, MIGRATIONS);
    expect(first.length).toBeGreaterThan(0);
    expect(await applyMigrations(client, MIGRATIONS)).toEqual([]);

    // テストの DB は global-setup で prisma migrate deploy したもの
    const prismaDb = createClient({ url: process.env.DATABASE_URL as string });
    try {
      expect(await schemaOf(client)).toEqual(await schemaOf(prismaDb));
    } finally {
      prismaDb.close();
    }
  });

  it("途中で失敗した記録が残っていたら先に進まない", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "photogacha-migrate-"));
    client = createClient({ url: `file:${path.join(dir, "turso.db")}` });
    await applyMigrations(client, MIGRATIONS);
    await client.execute(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name") VALUES ('x', '', '99999999999999_broken')`,
    );
    await expect(applyMigrations(client, MIGRATIONS)).rejects.toThrow(
      "99999999999999_broken",
    );
  });
});
