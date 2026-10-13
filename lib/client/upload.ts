/** 選べる写真の大きさ。送る前に縮めるので、スマホの写真そのままでよい */
export const MAX_UPLOAD_MB = 20;
export const ACCEPT_IMAGES =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";

/** 送る画像の上限（サーバーの MAX_UPLOAD_BYTES と同じ。Vercel は 4.5MB を超えると受け付けない） */
const MAX_SEND_BYTES = 4 * 1024 * 1024;
/** 長い辺をここまで縮める。カードの表示には十分で、通信量も抑えられる */
const MAX_EDGE = 1440;
/** これより小さく、縮める必要もない画像はそのまま送る */
const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;

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

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.85),
  );
}

/** 大きな写真は送る前に縮める。小さいもの（と、動きを残したい GIF）はそのまま */
export async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === "image/gif" && file.size <= MAX_SEND_BYTES) return file;
  const url = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(url);
    } catch {
      // ブラウザが読めない形式でも、小さければサーバーの判定に任せる
      if (file.size <= MAX_SEND_BYTES) return file;
      throw new Error("この画像は読み込めませんでした");
    }
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight),
    );
    if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を縮められませんでした");
    // JPEG では透明な部分が黒くなるので、白で塗ってから描く
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // WebP で書き出せないブラウザ（古い Safari）は JPEG にする
    let blob = await toBlob(canvas, "image/webp");
    if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
    if (!blob) throw new Error("画像を縮められませんでした");
    if (blob.size > MAX_SEND_BYTES) throw new Error("画像が大きすぎます");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(file: File): Promise<string> {
  const image = await shrinkImage(file);
  const body = new FormData();
  body.append(
    "file",
    image,
    image === file ? file.name : `photo.${image.type.split("/")[1]}`,
  );
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
