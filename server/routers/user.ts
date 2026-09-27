import { TRPCError } from "@trpc/server";
import {
  DAILY_BONUS,
  TAP_COOLDOWN_MS,
  TAP_DAILY_LIMIT,
  TAP_REWARD,
} from "@/lib/constants/points";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { nextJstDay, startOfJstDay } from "@/server/time";

function tapRewardsLeft(
  user: { tapRewardDay: Date | null; tapRewardCount: number },
  now: Date,
) {
  const counted =
    user.tapRewardDay &&
    user.tapRewardDay.getTime() === startOfJstDay(now).getTime()
      ? user.tapRewardCount
      : 0;
  return Math.max(0, TAP_DAILY_LIMIT - counted);
}

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        lastDailyBonusAt: true,
        tapRewardDay: true,
        tapRewardCount: true,
      },
    });
    const now = new Date();
    const dailyBonusAvailable =
      !user.lastDailyBonusAt || user.lastDailyBonusAt < startOfJstDay(now);
    return {
      id: user.id,
      name: user.name ?? user.email?.split("@")[0] ?? "ゲスト",
      email: user.email,
      points: user.points,
      dailyBonusAvailable,
      nextDailyBonusAt: dailyBonusAvailable ? null : nextJstDay(now),
      tapRewardsLeft: tapRewardsLeft(user, now),
    };
  }),

  /**
   * シャッターを規定回数連打したときの報酬。
   * 連打の回数はクライアントでしか数えられないので、最短間隔と 1 日の上限で抑える。
   */
  tapReward: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const today = startOfJstDay(now);
    const cooledDown = {
      OR: [
        { lastTapRewardAt: null },
        { lastTapRewardAt: { lt: new Date(now.getTime() - TAP_COOLDOWN_MS) } },
      ],
    };
    // 今日すでに受け取っている場合は回数を加算、日付が変わっていれば 1 からやり直す
    const sameDay = await ctx.prisma.user.updateMany({
      where: {
        id: ctx.userId,
        tapRewardDay: today,
        tapRewardCount: { lt: TAP_DAILY_LIMIT },
        ...cooledDown,
      },
      data: {
        points: { increment: TAP_REWARD },
        lastTapRewardAt: now,
        tapRewardCount: { increment: 1 },
      },
    });
    const count =
      sameDay.count ||
      (
        await ctx.prisma.user.updateMany({
          where: {
            id: ctx.userId,
            AND: [
              { OR: [{ tapRewardDay: null }, { tapRewardDay: { lt: today } }] },
              cooledDown,
            ],
          },
          data: {
            points: { increment: TAP_REWARD },
            lastTapRewardAt: now,
            tapRewardDay: today,
            tapRewardCount: 1,
          },
        })
      ).count;

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: { points: true, tapRewardDay: true, tapRewardCount: true },
    });
    const left = tapRewardsLeft(user, now);
    if (count === 0) {
      throw new TRPCError(
        left === 0
          ? {
              code: "TOO_MANY_REQUESTS",
              message: "今日のシャッター報酬は上限に達しました",
            }
          : {
              code: "TOO_MANY_REQUESTS",
              message: "ちょっと速すぎます。ひと呼吸おいてからもう一度",
            },
      );
    }
    return { reward: TAP_REWARD, points: user.points, tapRewardsLeft: left };
  }),

  claimDailyBonus: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const { count } = await ctx.prisma.user.updateMany({
      where: {
        id: ctx.userId,
        OR: [
          { lastDailyBonusAt: null },
          { lastDailyBonusAt: { lt: startOfJstDay(now) } },
        ],
      },
      data: { points: { increment: DAILY_BONUS }, lastDailyBonusAt: now },
    });
    if (count === 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "今日のボーナスは受け取り済みです",
      });
    }
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: { points: true },
    });
    return { reward: DAILY_BONUS, points: user.points };
  }),
});
