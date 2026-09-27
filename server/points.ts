import type { PrismaClient } from "@/lib/generated/prisma/client";
import { startOfJstDay } from "@/server/time";

/** Prisma の既知エラーコードを取り出す */
export function prismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : null;
}

type RewardKind = "image" | "pack";

/**
 * 1 日の回数上限つきでボーナスを付与する。付与したポイント（上限なら 0）を返す。
 * 条件付き更新なので同時に呼ばれても上限を超えない。
 */
export async function grantDailyReward(
  prisma: Pick<PrismaClient, "user">,
  userId: string,
  kind: RewardKind,
  amount: number,
  limit: number,
) {
  const today = startOfJstDay(new Date());
  const day = kind === "image" ? "imageRewardDay" : "packRewardDay";
  const count = kind === "image" ? "imageRewardCount" : "packRewardCount";
  const sameDay = await prisma.user.updateMany({
    where: { id: userId, [day]: today, [count]: { lt: limit } },
    data: { points: { increment: amount }, [count]: { increment: 1 } },
  });
  if (sameDay.count > 0) return amount;
  const newDay = await prisma.user.updateMany({
    where: { id: userId, OR: [{ [day]: null }, { [day]: { lt: today } }] },
    data: { points: { increment: amount }, [day]: today, [count]: 1 },
  });
  return newDay.count > 0 ? amount : 0;
}

/**
 * 削除時にボーナスを返却する。ポイントが足りなければ false（削除させない）。
 * 0 未満にして帳消しにすると、作成と削除の繰り返しでポイントを稼げてしまうため。
 */
export async function takeBackReward(
  prisma: Pick<PrismaClient, "user">,
  userId: string,
  amount: number,
) {
  if (amount <= 0) return true;
  const { count } = await prisma.user.updateMany({
    where: { id: userId, points: { gte: amount } },
    data: { points: { decrement: amount } },
  });
  return count > 0;
}

export async function giveBack(
  prisma: Pick<PrismaClient, "user">,
  userId: string,
  amount: number,
) {
  if (amount <= 0) return;
  await prisma.user
    .update({ where: { id: userId }, data: { points: { increment: amount } } })
    .catch(() => {});
}
