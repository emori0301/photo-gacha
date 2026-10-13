import type { NextConfig } from "next";

// DATABASE_URL などは実行時の環境変数から読む（ここで env に入れるとビルド時の値で固定されてしまう）
const nextConfig: NextConfig = {
  images: {
    // 写真はアップロード前に縮めてあるので、そのまま表示する。
    // Vercel の無料プランは画像の変換回数に上限があり、超えると表示できなくなるため使わない
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Service Worker は更新をすぐ届けたいのでキャッシュさせない。Service Worker から読めるのは同じオリジンだけにする
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
