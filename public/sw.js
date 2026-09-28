// ホーム画面から開いたアプリには再読み込みボタンもアドレスバーも無いので、
// 電波が無いときはブラウザのエラー画面の代わりに offline.html を出す。
// ページや API はキャッシュしない（ポイントやカードは常にサーバーの最新を使う）。
// offline.html を変えたら CACHE の番号を上げる（上げないと古い画面が残る）。
const CACHE = "photogacha-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // 画面の読み込み以外（API・画像・JS）は Service Worker を通さずに直接取りに行く。
  // 通すとその分だけ毎回待たされる（Static Routing API。Chrome 123 以降、未対応のブラウザは従来どおり）
  try {
    event.waitUntil(
      event
        .addRoutes(
          ["same-origin", "no-cors", "cors"].map((requestMode) => ({
            condition: { requestMode },
            source: "network",
          })),
        )
        .catch(() => {}),
    );
  } catch {
    // addRoutes が無いブラウザ
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.add(new Request(OFFLINE_URL, { cache: "reload" })),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("photogacha-") && key !== CACHE) {
          await caches.delete(key);
        }
      }
      // Service Worker の起動を待たずに、ページの取得を並行して始める
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // 画面の読み込み（GET）だけを扱う。画像や API、フォーム送信はブラウザにそのまま任せる
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        return preloaded ?? (await fetch(request));
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
  );
});
