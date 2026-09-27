"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  PageTitle,
  Skeleton,
} from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { PACK_OPEN_COST } from "@/lib/constants/points";
import type { Rarity } from "@/lib/constants/rarity";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { GachaMachine, type MachinePhase } from "./gacha-machine";
import { PackPicker } from "./pack-picker";
import { type RevealCard, RevealOverlay } from "./reveal-overlay";

const LAST_PACK_KEY = "photogacha:last-pack";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readLastPack() {
  try {
    return localStorage.getItem(LAST_PACK_KEY);
  } catch {
    return null;
  }
}

function saveLastPack(id: string) {
  try {
    localStorage.setItem(LAST_PACK_KEY, id);
  } catch {
    // 保存できなくても動作には影響しない
  }
}

export function GachaView() {
  const utils = trpc.useUtils();
  const packs = trpc.pack.list.useQuery();
  const me = trpc.user.me.useQuery();
  const open = trpc.pack.open.useMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<MachinePhase>("idle");
  const [result, setResult] = useState<{
    id: number;
    cards: RevealCard[];
    best: Rarity;
    points: number;
  } | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const busy = useRef(false);

  const list = packs.data ?? [];
  const selected = list.find((p) => p.id === selectedId) ?? null;
  const points = me.data?.points ?? 0;

  // 初期選択: 前回のパック → 先頭
  useEffect(() => {
    if (!packs.data?.length) return;
    if (selectedId && packs.data.some((p) => p.id === selectedId)) return;
    const last = readLastPack();
    setSelectedId(
      packs.data.find((p) => p.id === last)?.id ?? packs.data[0].id,
    );
  }, [packs.data, selectedId]);

  const machineRef = useRef<HTMLDivElement>(null);
  const select = (id: string) => {
    setSelectedId(id);
    saveLastPack(id);
    // スマホでは台がリストより上にあるので、選んだら台まで戻す
    if (window.matchMedia("(max-width: 1023px)").matches) {
      machineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const turn = async () => {
    if (!selected || busy.current) return;
    // 「もう一回」から呼ばれたときも最新の残高で判定する
    const current = utils.user.me.getData()?.points ?? 0;
    if (current < PACK_OPEN_COST) {
      toast.error(`ポイントが足りません（${PACK_OPEN_COST}pt 必要）`);
      return;
    }
    busy.current = true;
    setPhase("turning");
    try {
      const [res] = await Promise.all([
        open.mutateAsync({ packId: selected.id }),
        wait(900),
      ]);
      // 途中で画面を離れても図鑑などが最新になるよう、結果が出た時点で更新する
      void utils.collection.invalidate();
      void utils.pack.list.invalidate();
      void utils.image.mine.invalidate();
      utils.user.me.setData(undefined, (old) =>
        old ? { ...old, points: res.points } : old,
      );
      // id を変えてリビール画面の状態（何枚目か等）を毎回リセットする
      setResult((prev) => ({ ...res, id: (prev?.id ?? 0) + 1 }));
      setPhase("capsule");
    } catch (error) {
      toast.error(errorMessage(error, "ガチャを回せませんでした"));
      setPhase("idle");
      void utils.user.me.invalidate();
      void utils.pack.list.invalidate();
    } finally {
      busy.current = false;
    }
  };

  const openCapsule = async () => {
    if (phase !== "capsule") return;
    setPhase("opening");
    toast.dismiss();
    await wait(420);
    setRevealOpen(true);
  };

  const finish = () => {
    setRevealOpen(false);
    setPhase("idle");
  };

  // 結果を見る前に別の画面へ移動した場合も、引いたカードは図鑑に入っていることを伝える
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(
    () => () => {
      if (phaseRef.current === "capsule" || phaseRef.current === "opening") {
        toast("引いたカードは図鑑に追加されています");
      }
    },
    [],
  );

  const again = () => {
    finish();
    // ダイアログが閉じてから回し始める
    setTimeout(() => void turn(), 150);
  };

  const canAfford = points >= PACK_OPEN_COST;

  return (
    <>
      <PageTitle title="ガチャ" lead="パックを選んで、ハンドルを回そう。" />

      {packs.isLoading ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <Skeleton className="mx-auto aspect-[3/4] w-full max-w-[340px]" />
          <div className="space-y-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      ) : packs.isError ? (
        <EmptyState
          title="パックを読み込めませんでした"
          action={<Button onClick={() => packs.refetch()}>再読み込み</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState
          title="まだパックがありません"
          action={
            <Button asChild>
              <Link href="/studio">工房でパックを作る</Link>
            </Button>
          }
        >
          写真を登録してパックを作ると、ここに並びます。作った人にはボーナスポイントも。
        </EmptyState>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <div ref={machineRef} className="scroll-mt-24 lg:sticky lg:top-24">
            <GachaMachine
              pack={selected}
              phase={phase}
              best={result?.best ?? null}
              canAfford={canAfford}
              onTurn={turn}
              onOpenCapsule={openCapsule}
            />
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                size="lg"
                onClick={turn}
                disabled={!selected || phase !== "idle" || !canAfford}
                className="min-w-56"
              >
                {phase === "turning"
                  ? "ガラガラ…"
                  : `${PACK_OPEN_COST}pt で回す`}
              </Button>
              {!canAfford && phase === "idle" && (
                <p className="text-sm text-ink-2">
                  ポイントが足りません。
                  <Link
                    href="/earn"
                    className="font-bold text-red underline underline-offset-4"
                  >
                    ポイントを貯める
                  </Link>
                </p>
              )}
              {phase === "capsule" && (
                <p className="animate-pop text-sm font-bold">
                  カプセルをタップして開けよう
                </p>
              )}
            </div>
          </div>

          <section aria-labelledby="pack-list-title">
            <h2 id="pack-list-title" className="mb-3 font-display text-lg">
              パックをえらぶ
              <span className="ml-2 font-sans text-sm font-bold text-ink-3">
                {list.length}
              </span>
            </h2>
            <PackPicker
              packs={list}
              selectedId={selectedId}
              onSelect={select}
              disabled={phase !== "idle"}
            />
          </section>
        </div>
      )}

      {result && (
        <RevealOverlay
          key={result.id}
          open={revealOpen}
          packName={selected?.name ?? "ガチャ結果"}
          cards={result.cards}
          points={me.data?.points ?? result.points}
          onClose={finish}
          onAgain={again}
        />
      )}
    </>
  );
}
