"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import {
  getInstallPrompt,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/client/pwa";
import { CapsuleMark } from "./logo";

const DISMISSED_KEY = "photogacha:install-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // 保存できなくても、この画面を開いている間は閉じたままになる
  }
}

/**
 * ブラウザで開いているときに、ホーム画面への追加を案内する。
 * Android / PC の Chrome はインストールの確認を出し、iPhone は共有メニューからの手順を見せる。
 */
export function InstallBanner() {
  const installPrompt = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPrompt,
    () => null,
  );
  // ホーム画面から開いているか・閉じたことがあるかはブラウザでしか分からないので、描画後に判定する
  const [target, setTarget] = useState<{ ios: boolean } | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || readDismissed()) return;
    setTarget({ ios: isIos() });
  }, []);

  if (!target || (!target.ios && !installPrompt)) return null;

  const install = async () => {
    if (target.ios) {
      setStepsOpen(true);
      return;
    }
    if (await promptInstall()) setTarget(null);
  };

  return (
    <>
      <aside
        aria-label="アプリとして使う"
        className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md animate-rise items-center gap-3 rounded-2xl border-2 border-ink bg-card py-2.5 pr-2 pl-3 shadow-hard md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-mustard"
        >
          <CapsuleMark className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">アプリとして使う</p>
          {/* 文節の途中で折り返さないよう、まとまりごとに inline-block にする */}
          <p className="text-xs leading-snug text-ink-2 [&>span]:inline-block">
            <span>ホーム画面から</span>
            <span>すぐ開けます</span>
          </p>
        </div>
        <Button size="sm" onClick={install}>
          追加する
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="案内を閉じる"
          title="閉じる"
          onClick={() => {
            saveDismissed();
            setTarget(null);
          }}
        >
          <X />
        </Button>
      </aside>

      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent title="ホーム画面に追加する" className="max-w-sm">
          <DialogBody className="pt-3">
            <ol className="space-y-4">
              <Step n={1}>
                <span className="inline-flex flex-wrap items-center gap-1">
                  共有ボタン
                  <Share className="size-4" aria-hidden />
                  をタップ
                </span>
                <span className="block text-xs font-medium text-ink-2">
                  見当たらないときは「…」メニューの中にあります
                </span>
              </Step>
              <Step n={2}>
                <span className="inline-flex flex-wrap items-center gap-1">
                  「ホーム画面に追加」
                  <SquarePlus className="size-4" aria-hidden />
                  を選ぶ
                </span>
              </Step>
              <Step n={3}>「追加」をタップ</Step>
            </ol>
            <p className="mt-5 rounded-xl bg-paper-2 px-3 py-2 text-xs text-ink-2">
              LINE などのアプリの中で開いているときは、先に「Safari
              で開く」を選んでください。
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-mustard font-mono text-sm font-bold"
      >
        {n}
      </span>
      <div className="min-w-0 pt-0.5 text-[15px] font-bold">{children}</div>
    </li>
  );
}
