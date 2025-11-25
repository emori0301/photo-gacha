import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // public/uploadsディレクトリを作成
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    // ファイルを保存
    await writeFile(filepath, buffer);

    // パスを返す（/uploads/...）
    const imageUrl = `/uploads/${filename}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}


