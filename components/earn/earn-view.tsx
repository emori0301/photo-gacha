"use client";

import { Gift } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  DAILY_BONUS,
  IMAGE_UPLOAD_REWARD,
  PACK_CREATE_REWARD,
  PACK_OPEN_COST,
  TAP_DAILY_LIMIT,
  TAP_REWARD,
  TAP_TARGET,
} from "@/lib/constants/points";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const BLADES = Array.from({ length: 6 }, (_, i) => i * 60);
const RING = 2 * Math.PI * 92;

function ShutterGame() {
  const utils = trpc.useUtils();
  const me = trpc.user.me.useQuery();
  const reward = trpc.user.tapReward.useMutation();
  const left = me.data?.tapRewardsLeft;
  const exhausted = left === 0;
  const [count, setCount] = useState(0);
  const [snap, setSnap] = useState(0);
  const [flash, setFlash] = useState(0);
  const [earned, setEarned] = useState(0);
  const [pops, setPops] = useState<number[]>([]);
  const popId = useRef(0);

  const tap = () => {
    // 受け取り中・上限到達時はシャッターだけ切れる（回数は増やさない）
    setSnap((s) => s + 1);
    if (reward.isPending || exhausted) return;
    const next = count + 1;
    setCount(next);
    if (next < TAP_TARGET) return;
    reward.mutate(undefined, {
      onSuccess: (res) => {
        setCount(0);
        setFlash((f) => f + 1);
        utils.user.me.setData(undefined, (old) =>
          old
            ? { ...old, points: res.points, tapRewardsLeft: res.tapRewardsLeft }
            : old,
        );
        setEarned((e) => e + res.reward);
        const id = popId.current++;
        setPops((p) => [...p, id]);
        setTimeout(() => setPops((p) => p.filter((x) => x !== id)), 900);
      },
      onError: (error) => {
        // 失敗したら 1 回分だけ戻し、もう 1 回押せば再挑戦できるようにする
        setCount(TAP_TARGET - 1);
        toast.error(errorMessage(error, "ポイントを受け取れませんでした"));
        void utils.user.me.invalidate();
      },
    });
  };

  const progress = count / TAP_TARGET;

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-ink bg-card p-6 shadow-hard">
      {flash > 0 && (
        <div
          key={flash}
          aria-hidden="true"
          className="flash pointer-events-none absolute inset-0 z-10 bg-white"
        />
      )}
      <h2 className="font-display text-xl">シャッター連打</h2>
      <p className="mt-1 text-sm text-ink-2">
        {TAP_TARGET} 回切るごとに +{TAP_REWARD}pt（1 日 {TAP_DAILY_LIMIT}{" "}
        回まで）。スペースキーでも押せます。
      </p>

      <div className="relative mx-auto mt-6 grid size-56 place-items-center">
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="var(--color-paper-2)"
            strokeWidth="10"
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="var(--color-red)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-150"
          />
        </svg>
        <button
          type="button"
          onClick={tap}
          aria-label={`シャッターを切る（${count} / ${TAP_TARGET}）`}
          className="relative size-44 touch-manipulation overflow-hidden rounded-full border-[3px] border-ink bg-ink shadow-hard transition-transform active:scale-95"
        >
          <svg
            key={snap}
            viewBox="-50 -50 100 100"
            className={cn(
              "absolute inset-0 size-full",
              snap > 0 && "aperture-snap",
            )}
            aria-hidden="true"
          >
            {BLADES.map((deg) => (
              <path
                key={deg}
                d="M0 -46 L40 -23 L8 -6 Z"
                transform={`rotate(${deg})`}
                fill={deg % 120 === 0 ? "#3a3430" : "#2b2622"}
                stroke="#554d46"
                strokeWidth="1"
              />
            ))}
            <circle r="13" fill="#1a1715" stroke="#6d645b" strokeWidth="1.5" />
            <circle cx="-4" cy="-5" r="4" fill="#fff" opacity=".35" />
          </svg>
          <span className="absolute inset-x-0 bottom-7 font-mono text-lg font-medium text-paper tabular-nums">
            {count}/{TAP_TARGET}
          </span>
        </button>
        {pops.map((id) => (
          <span
            key={id}
            aria-hidden="true"
            className="pointer-events-none absolute top-6 animate-float-up font-display text-2xl text-red"
          >
            +{TAP_REWARD}pt
          </span>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-ink-2" aria-live="polite">
        今回 <b className="font-mono text-ink">+{earned}pt</b>
        {left !== undefined && (
          <>
            {" ・ "}
            {exhausted ? "今日はここまで。また明日" : `今日はあと ${left} 回`}
          </>
        )}
      </p>
    </section>
  );
}

function DailyBonus() {
  const utils = trpc.useUtils();
  const me = trpc.user.me.useQuery();
  const claim = trpc.user.claimDailyBonus.useMutation({
    onSuccess: (res) => {
      utils.user.me.setData(undefined, (old) =>
        old ? { ...old, points: res.points, dailyBonusAvailable: false } : old,
      );
      void utils.user.me.invalidate();
      toast.success(`ログインボーナス +${res.reward}pt`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, "受け取れませんでした"));
      void utils.user.me.invalidate();
    },
  });
  const available = me.data?.dailyBonusAvailable ?? false;

  return (
    <section
      className={cn(
        "flex flex-col justify-between gap-4 rounded-3xl border-2 border-ink p-6 shadow-hard",
        available ? "bg-mustard" : "bg-card",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <Gift className="size-5" />
          <h2 className="font-display text-xl">今日のボーナス</h2>
        </div>
        <p className="mt-1 text-sm text-ink/75">
          1 日 1 回 +{DAILY_BONUS}pt。日付は日本時間の 0 時に変わります。
        </p>
      </div>
      <Button
        variant={available ? "primary" : "secondary"}
        size="lg"
        disabled={!available || claim.isPending || me.isLoading}
        onClick={() => claim.mutate()}
      >
        {me.isLoading
          ? "確認中…"
          : available
            ? `+${DAILY_BONUS}pt 受け取る`
            : "受け取り済み・また明日"}
      </Button>
    </section>
  );
}

export function EarnView() {
  return (
    <>
      <PageTitle
        title="ポイント"
        lead="ガチャを回すためのポイントを貯めよう。"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ShutterGame />
        <div className="flex flex-col gap-6">
          <DailyBonus />
          <section className="rounded-3xl border-2 border-dashed border-ink/40 p-6">
            <h2 className="font-display text-lg">ポイントのしくみ</h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt>ガチャを 1 回まわす</dt>
              <dd className="font-mono font-bold text-red-deep">
                −{PACK_OPEN_COST}pt
              </dd>
              <dt>写真をカードにする</dt>
              <dd className="font-mono font-bold">+{IMAGE_UPLOAD_REWARD}pt</dd>
              <dt>パックを作る</dt>
              <dd className="font-mono font-bold">+{PACK_CREATE_REWARD}pt</dd>
              <dt>ログインボーナス（1 日 1 回）</dt>
              <dd className="font-mono font-bold">+{DAILY_BONUS}pt</dd>
              <dt>シャッター {TAP_TARGET} 回</dt>
              <dd className="font-mono font-bold">+{TAP_REWARD}pt</dd>
            </dl>
            <p className="mt-3 text-xs text-ink-2">
              カードやパックを削除すると、作成時のボーナスは返却されます。
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
