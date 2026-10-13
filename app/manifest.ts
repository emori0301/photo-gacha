import type { MetadataRoute } from "next";

/**
 * ホーム画面に追加したときの名前・アイコン・起動画面の色。
 * アイコンは `npm run icons` で作る（scripts/generate-icons.ts）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PhotoGacha",
    short_name: "PhotoGacha",
    description:
      "撮った写真が、ガチャになる。写真をカードにして、パックを作って、みんなで引き合おう。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
    categories: ["entertainment", "photo"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Android でアイコンを長押ししたときのメニュー
    shortcuts: [
      { name: "図鑑", url: "/collection" },
      { name: "工房", url: "/studio" },
      { name: "ポイント", url: "/earn" },
    ],
  };
}
