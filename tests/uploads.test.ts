import { describe, expect, it } from "vitest";
import { nextJstDay, startOfJstDay } from "@/server/time";
import {
  isSafeFilename,
  mimeForFilename,
  sniffImageType,
} from "@/server/uploads";

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
