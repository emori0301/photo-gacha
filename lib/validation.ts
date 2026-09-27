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

/** アップロード API が返した /uploads/<ファイル名> 形式のみ許可する */
export const uploadUrlSchema = z
  .string()
  .max(300)
  .regex(/^\/uploads\/[^/\\?#]+$/, "画像のパスが不正です")
  .refine((url) => !url.includes(".."), "画像のパスが不正です");
