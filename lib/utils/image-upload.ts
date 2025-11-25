/**
 * 画像をアップロードする共通関数
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload image");
  }

  const { imageUrl } = await res.json();
  return imageUrl;
}

