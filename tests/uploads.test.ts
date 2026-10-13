import { del, put } from "@vercel/blob";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextJstDay, startOfJstDay } from "@/server/time";
import {
  isSafeFilename,
  mimeForFilename,
  removeUpload,
  saveUpload,
  sniffImageType,
} from "@/server/uploads";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://store1.public.blob.vercel-storage.com/${pathname}`,
  })),
  del: vi.fn(async () => {}),
}));

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) =>
      typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v],
    ),
  );

describe("sniffImageType", () => {
  it("先頭バイトで画像形式を判定する", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(sniffImageType(bytes("GIF89a"))).toBe("image/gif");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe(
      "image/webp",
    );
    expect(sniffImageType(bytes(0, 0, 0, 0x1c, "ftypavif"))).toBe("image/avif");
  });

  it("画像でないものは null", () => {
    expect(sniffImageType(bytes("<svg xmlns"))).toBeNull();
    expect(sniffImageType(bytes("<html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("isSafeFilename", () => {
  it("ディレクトリ移動や隠しファイルを拒否する", () => {
    expect(isSafeFilename("abc-123.png")).toBe(true);
    expect(isSafeFilename("../etc/passwd")).toBe(false);
    expect(isSafeFilename("a/b.png")).toBe(false);
    expect(isSafeFilename(".env")).toBe(false);
    expect(isSafeFilename("..")).toBe(false);
  });

  it("拡張子から MIME を返す", () => {
    expect(mimeForFilename("x.JPG")).toBe("image/jpeg");
    expect(mimeForFilename("x.svg")).toBeNull();
  });
});

describe("JST の日付境界", () => {
  it("UTC 14:59 は JST 23:59（同じ日）", () => {
    const now = new Date("2026-01-01T14:59:00Z");
    expect(startOfJstDay(now).toISOString()).toBe("2025-12-31T15:00:00.000Z");
    expect(nextJstDay(now).toISOString()).toBe("2026-01-01T15:00:00.000Z");
  });

  it("UTC 15:00 は JST の翌日 0:00", () => {
    const now = new Date("2026-01-01T15:00:00Z");
    expect(startOfJstDay(now).toISOString()).toBe("2026-01-01T15:00:00.000Z");
  });
});

describe("resolveDatabaseUrl", async () => {
  const { resolveDatabaseUrl } = await import("@/lib/prisma");
  it("相対パスは prisma/ 基準にする", () => {
    expect(resolveDatabaseUrl("file:./dev.db")).toBe(
      `file:${process.cwd()}/prisma/dev.db`,
    );
    expect(resolveDatabaseUrl("file:/tmp/a.db")).toBe("file:/tmp/a.db");
    expect(resolveDatabaseUrl(undefined)).toBeUndefined();
  });
});

describe("保存先", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("BLOB_READ_WRITE_TOKEN があれば Vercel Blob に保存し、消すときも Blob から消す", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const url = await saveUpload(new Uint8Array([1, 2, 3]), "image/webp");
    expect(url).toMatch(
      /^https:\/\/store1\.public\.blob\.vercel-storage\.com\/uploads\/[0-9a-f-]+\.webp$/,
    );
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/.+\.webp$/),
      expect.any(Buffer),
      expect.objectContaining({ access: "public", contentType: "image/webp" }),
    );
    await removeUpload(url);
    expect(del).toHaveBeenCalledWith(url);
  });

  it("今の Vercel の方式（BLOB_STORE_ID）でも Vercel Blob に保存する", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_abc123");
    const url = await saveUpload(new Uint8Array([1, 2, 3]), "image/png");
    expect(put).toHaveBeenCalled();
    expect(url).toMatch(/^https:\/\/.+\/uploads\/[0-9a-f-]+\.png$/);
  });

  it("手元ではディスクに保存する", async () => {
    const url = await saveUpload(new Uint8Array([1, 2, 3]), "image/png");
    expect(url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    expect(put).not.toHaveBeenCalled();
    await removeUpload(url);
    expect(del).not.toHaveBeenCalled();
  });

  it("Vercel でトークンが無ければ、分かるエラーにする", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(
      saveUpload(new Uint8Array([1, 2, 3]), "image/png"),
    ).rejects.toThrow("Blob ストアがつながっていません");
  });
});

describe("databaseEnv", async () => {
  const { databaseEnv } = await import("@/lib/database-env");
  afterEach(() => vi.unstubAllEnvs());

  it("Vercel の Turso 連携が入れる TURSO_* を優先する", () => {
    vi.stubEnv("DATABASE_URL", "file:./dev.db");
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://db-user.turso.io");
    vi.stubEnv("TURSO_AUTH_TOKEN", "token");
    expect(databaseEnv()).toEqual({
      url: "libsql://db-user.turso.io",
      authToken: "token",
    });
  });

  it("無ければ DATABASE_URL を使う", () => {
    vi.stubEnv("DATABASE_URL", "file:./dev.db");
    vi.stubEnv("TURSO_DATABASE_URL", "");
    vi.stubEnv("TURSO_AUTH_TOKEN", "");
    vi.stubEnv("DATABASE_AUTH_TOKEN", "");
    expect(databaseEnv()).toEqual({
      url: "file:./dev.db",
      authToken: undefined,
    });
  });
});
