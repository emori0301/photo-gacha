import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("メールアドレスの形式が正しくありません"));

export const passwordSchema = z
  .string()
  .min(8, "パスワードは 8 文字以上にしてください")
  .max(72, "パスワードは 72 文字以内にしてください");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "名前を入力してください")
  .max(24, "名前は 24 文字以内にしてください");

/** Vercel Blob に保存した画像の URL（https://<ストア>.public.blob.vercel-storage.com/uploads/<ファイル名>） */
export const BLOB_URL_PATTERN =
  /^https:\/\/[A-Za-z0-9-]+\.public\.blob\.vercel-storage\.com\/uploads\/[A-Za-z0-9._-]+$/;

/**
 * アップロード API が返した形式のみ許可する。
 * 手元では /uploads/<ファイル名>、Vercel では Vercel Blob の URL。
 */
export const uploadUrlSchema = z
  .string()
  .max(300)
  .refine(
    (url) => /^\/uploads\/[^/\\?#]+$/.test(url) || BLOB_URL_PATTERN.test(url),
    "画像のパスが不正です",
  )
  .refine((url) => !url.includes(".."), "画像のパスが不正です");
