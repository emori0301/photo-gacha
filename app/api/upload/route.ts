import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  saveUpload,
  sniffImageType,
} from "@/server/uploads";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("ログインが必要です", 401);
  }

  // 本文を読み込む前にサイズを確認する（巨大なリクエストでメモリを使い切らないように）
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) {
    return fail("ファイルサイズを確認できませんでした", 411);
  }
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) {
    return fail(
      `ファイルが大きすぎます（最大 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB）`,
      413,
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("ファイルを読み取れませんでした", 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    return fail("ファイルが選択されていません", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(
      `ファイルが大きすぎます（最大 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB）`,
      413,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type || !ACCEPTED_IMAGE_TYPES.includes(type)) {
    return fail("JPEG / PNG / WebP / GIF / AVIF の画像を選んでください", 415);
  }

  try {
    const imageUrl = await saveUpload(bytes, type);
    await prisma.upload.create({ data: { url: imageUrl, userId } });
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return fail("保存に失敗しました", 500);
  }
}
