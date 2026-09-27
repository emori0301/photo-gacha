import type { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * ボーナス返却用のクエリ。ポイントは 0 未満にしない。
 * バッチトランザクション（$transaction([...])）に並べて使う。
 * 「足りない場合は 0 にする」→「足りる場合は減らす」の順で実行する必要がある。
 */
export function refundBonusQueries(
  prisma: Pick<PrismaClient, "user">,
  userId: string,
  amount: number,
) {
  return [
    prisma.user.updateMany({
      where: { id: userId, points: { lt: amount } },
      data: { points: 0 },
    }),
    prisma.user.updateMany({
      where: { id: userId, points: { gte: amount } },
      data: { points: { decrement: amount } },
    }),
  ] as const;
}

/** Prisma の既知エラーコードを取り出す */
export function prismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : null;
}
