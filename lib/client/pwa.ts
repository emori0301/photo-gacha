/** ホーム画面に追加（インストール）して使うための、ブラウザ側の処理 */

/** Chrome / Edge / Samsung Internet が出す、インストールの確認を後から開くためのイベント */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let installPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setInstallPrompt(event: InstallPromptEvent | null) {
  installPrompt = event;
  for (const listener of listeners) listener();
}

// beforeinstallprompt は画面の描画より先に届くことがあるので、読み込んだ時点で受け取っておく
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // ブラウザ既定の案内は出さず、アプリ内の案内から開く
    event.preventDefault();
    setInstallPrompt(event as InstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setInstallPrompt(null));
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallPrompt() {
  return installPrompt;
}

/** インストールの確認を出す。1 つのイベントで出せるのは 1 回だけ */
export async function promptInstall() {
  const event = installPrompt;
  if (!event) return false;
  setInstallPrompt(null);
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  }
}

/** ホーム画面から開いている（ブラウザの画面ではない） */
export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone / iPad（ホーム画面への追加は、共有メニューから手動で行う） */
export function isIos() {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS の Safari は Mac と名乗る
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function registerServiceWorker() {
  // 開発中は登録しない（別のプロジェクトを同じ localhost:3000 で開いたときに残らないように）
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
    return;
  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch((error) =>
      console.error("Service worker registration failed:", error),
    );
}
