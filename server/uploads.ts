import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { BLOB_URL_PATTERN } from "@/lib/validation";

/**
 * 1 回に受け取る画像の上限。Vercel は 4.5MB を超えるリクエストを受け付けないので、それより小さくする。
 * スマホの写真はブラウザ側で縮めてから送る（lib/client/upload.ts）。
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
);
MIME_BY_EXT.jpeg = "image/jpeg";

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXT_BY_MIME);

/**
 * アップロードファイルの保存先。
 * public/ に置くと本番ビルド後に追加されたファイルが配信されないため、
 * 専用ディレクトリに保存して /uploads/[filename] ルートから返す。
 */
export function uploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR)
    : path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads");
}

/** 以前のバージョンは public/uploads に保存していた */
function legacyUploadDir() {
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "uploads",
  );
}

const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export function isSafeFilename(name: string) {
  return SAFE_NAME.test(name) && !name.startsWith(".");
}

export function mimeForFilename(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? null;
}

/** 先頭バイトで実際に画像かどうかを確認する（拡張子詐称対策） */
export function sniffImageType(bytes: Uint8Array): string | null {
  const b = bytes;
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return "image/png";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12)))
    return "image/avif";
  return null;
}

/**
 * 画像の保存先。Vercel では Vercel Blob（BLOB_READ_WRITE_TOKEN があるとき）、手元ではディスク（uploadDir）。
 * Vercel のディスクは書き込めず、再起動で消えるので使えない。
 */
function blobEnabled() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN がありません。Vercel の Storage で Blob ストアを作り、このプロジェクトにつないでください",
    );
  }
  return false;
}

export async function saveUpload(bytes: Uint8Array, mime: string) {
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error("unsupported type");
  const filename = `${randomUUID()}.${ext}`;
  if (blobEnabled()) {
    const blob = await put(`uploads/${filename}`, Buffer.from(bytes), {
      access: "public",
      contentType: mime,
      // ファイル名は毎回新しいので、ずっとキャッシュしてよい
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  }
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), bytes);
  return `/uploads/${filename}`;
}

export async function readUpload(filename: string) {
  if (!isSafeFilename(filename)) return null;
  for (const dir of [uploadDir(), legacyUploadDir()]) {
    try {
      return await readFile(path.join(/*turbopackIgnore: true*/ dir, filename));
    } catch {
      // 次の候補へ
    }
  }
  return null;
}

/** 参照が無くなったアップロードを消す（失敗しても処理は続行） */
export async function removeUpload(url: string | null | undefined) {
  if (url && BLOB_URL_PATTERN.test(url)) {
    await del(url).catch((error) =>
      console.error("Blob delete failed:", error),
    );
    return;
  }
  const filename = url?.startsWith("/uploads/") ? url.slice(9) : null;
  if (!filename || !isSafeFilename(filename)) return;
  for (const dir of [uploadDir(), legacyUploadDir()]) {
    await unlink(path.join(/*turbopackIgnore: true*/ dir, filename)).catch(
      () => {},
    );
  }
}

type Db = Pick<PrismaClient, "upload" | "image" | "pack">;

/** 自分がアップロードした画像、または自分のカードの画像なら true */
export async function ownsUpload(prisma: Db, userId: string, url: string) {
  const [upload, image] = await Promise.all([
    prisma.upload.count({ where: { url, userId } }),
    prisma.image.count({ where: { imageUrl: url, userId } }),
  ]);
  return upload + image > 0;
}

/** どのカード・パックからも参照されなくなったアップロードを削除する */
export async function cleanupUpload(
  prisma: Db,
  url: string | null | undefined,
) {
  if (!url) return;
  const [images, packs] = await Promise.all([
    prisma.image.count({ where: { imageUrl: url } }),
    prisma.pack.count({ where: { thumbnailUrl: url } }),
  ]);
  if (images === 0) {
    // カードが消えたら、その画像からもう一度カードを作れる
    await prisma.upload.updateMany({ where: { url }, data: { used: false } });
  }
  if (images + packs > 0) return;
  await prisma.upload.deleteMany({ where: { url } });
  await removeUpload(url);
}
