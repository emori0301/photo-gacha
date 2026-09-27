export const MAX_UPLOAD_MB = 8;
export const ACCEPT_IMAGES =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";

/** 選択されたファイルを送信前にざっくり検証する（最終判定はサーバー） */
export function checkImageFile(file: File): string | null {
  if (!ACCEPT_IMAGES.split(",").includes(file.type)) {
    return "JPEG / PNG / WebP / GIF / AVIF の画像を選んでください";
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `ファイルが大きすぎます（最大 ${MAX_UPLOAD_MB}MB）`;
  }
  return null;
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body });
  } catch {
    throw new Error("通信に失敗しました");
  }
  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string;
    error?: string;
  };
  if (!res.ok || !data.imageUrl) {
    throw new Error(data.error ?? "アップロードに失敗しました");
  }
  return data.imageUrl;
}
