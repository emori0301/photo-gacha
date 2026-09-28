import type { NextConfig } from "next";

// DATABASE_URL などは実行時の環境変数から読む（ここで env に入れるとビルド時の値で固定されてしまう）
const nextConfig: NextConfig = {
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
