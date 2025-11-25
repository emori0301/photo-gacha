"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Coins, Zap } from "lucide-react";

export function PointEarner({ userId }: { userId: string }) {
  const [clickCount, setClickCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const targetClicks = 10;

  const utils = trpc.useUtils();
  const { data: points } = trpc.user.getPoints.useQuery({ userId });
  const addPoints = trpc.user.addPoints.useMutation({
    onSuccess: () => {
      toast.success("1ポイント獲得しました！");
      utils.user.getPoints.invalidate({ userId });
      setClickCount(0);
      setIsAnimating(false);
    },
    onError: (error) => {
      toast.error("ポイントの獲得に失敗しました", {
        description: error.message || "エラーが発生しました",
      });
      setClickCount(0);
      setIsAnimating(false);
    },
  });

  const handleClick = async () => {
    if (isAnimating) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= targetClicks) {
      setIsAnimating(true);
      try {
        await addPoints.mutateAsync({ userId, amount: 1 });
        // 成功時はonSuccessでリセットされる
      } catch {
        // エラーが発生しても回数をリセット
        setClickCount(0);
        setIsAnimating(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border-zinc-800/50 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400 drop-shadow-lg" />
            <h3 className="text-xl font-bold text-white">現在のポイント</h3>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
            {points ?? 0}pt
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border-zinc-800/50 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          ポイントを獲得
        </h3>
        <p className="text-zinc-300 mb-6">
          {targetClicks}回連打すると1ポイント獲得できます！
        </p>
        <div className="space-y-4">
          <div className="relative">
            <Button
              onClick={handleClick}
              disabled={isAnimating}
              className={`w-full py-12 text-2xl font-bold transition-all duration-300 ${
                isAnimating
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-xl shadow-green-500/50"
                  : clickCount >= targetClicks
                    ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 shadow-xl shadow-amber-500/50"
                    : "bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 shadow-lg"
              } text-white`}
            >
              {isAnimating ? (
                "✨ ポイント獲得！ ✨"
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-2" />
                  {clickCount}/{targetClicks} 回クリック
                </>
              )}
            </Button>
          </div>
          <div className="w-full bg-zinc-800/50 rounded-full h-4 overflow-hidden border border-zinc-700/50">
            <div
              className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 h-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${(clickCount / targetClicks) * 100}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
