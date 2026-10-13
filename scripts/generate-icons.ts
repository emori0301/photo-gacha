/**
 * アプリのアイコン（ホーム画面・PWA・ファビコン）を作り直す。
 * ロゴ（components/shell/logo.tsx の CapsuleMark）を変えたら、ここの図形も合わせて `npm run icons` を実行する。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INK = "#211d1a";
const RED = "#e0402a";
const CARD = "#fffdf8";
const MUSTARD = "#f2b52c";

/** CapsuleMark と同じ図形（32×32）。shadow を渡すと右下にずらした影を付ける */
function capsule(shadow = 0) {
  return [
    shadow &&
      `<circle cx="${16 + shadow}" cy="${16 + shadow}" r="14.25" fill="${INK}"/>`,
    `<path d="M3 16a13 13 0 0 1 26 0Z" fill="${RED}"/>`,
    `<path d="M3 16h26a13 13 0 0 1-26 0Z" fill="${CARD}"/>`,
    `<circle cx="16" cy="16" r="13" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
    `<path d="M3 16h26" stroke="${INK}" stroke-width="2.5"/>`,
    `<path d="M9.5 10.5a8 8 0 0 1 5-3.5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>`,
  ]
    .filter(Boolean)
    .join("");
}

/**
 * マスタードの地にドット柄とカプセル。512×512。
 * 角丸なしのものはマスカブル（OS が丸や角丸で切り抜く）用。カプセルは切り抜かれない中央 80% の円に収まる大きさ。
 */
function tile({ rounded }: { rounded: boolean }) {
  const size = 340;
  const shadow = 1;
  const scale = size / 32;
  // 影の分だけ左上へ寄せて、影込みの見た目を中央にする
  const offset = (512 - size) / 2 - (shadow / 2) * scale;
  const rx = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="3.2" fill="${INK}" fill-opacity=".12"/></pattern></defs>
<rect width="512" height="512" rx="${rx}" fill="${MUSTARD}"/>
<rect width="512" height="512" rx="${rx}" fill="url(#dots)"/>
<g transform="translate(${offset} ${offset}) scale(${scale})">${capsule(shadow)}</g>
</svg>`;
}

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${capsule()}</svg>`;

function png(svg: string, size: number) {
  return sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** PNG を並べた .ico を作る（PNG 入りの ICO はすべての現行ブラウザが読める） */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = アイコン
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

async function main() {
  const root = path.join(__dirname, "..");
  const app = path.join(root, "app");
  const icons = path.join(root, "public", "icons");
  await mkdir(icons, { recursive: true });

  const rounded = tile({ rounded: true });
  const square = tile({ rounded: false });
  const files: [string, Buffer | string][] = [
    // ブラウザのタブ（next が <link rel="icon"> を出す）
    [path.join(app, "icon.svg"), `${markSvg}\n`],
    [
      path.join(app, "favicon.ico"),
      ico(
        await Promise.all(
          [16, 32, 48].map(async (size) => ({
            size,
            data: await png(markSvg, size),
          })),
        ),
      ),
    ],
    // iPhone のホーム画面（角は iOS が丸めるので四角のまま）
    [path.join(app, "apple-icon.png"), await png(square, 180)],
    // app/manifest.ts から参照する
    [path.join(icons, "icon-192.png"), await png(rounded, 192)],
    [path.join(icons, "icon-512.png"), await png(rounded, 512)],
    [path.join(icons, "icon-maskable-512.png"), await png(square, 512)],
  ];
  for (const [file, data] of files) {
    await writeFile(file, data);
    console.log(path.relative(root, file));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
