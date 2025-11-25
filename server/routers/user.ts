import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/server";

export const userRouter = createTRPCRouter({
  getPoints: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { points: true },
      });
      return user?.points ?? 10;
    }),

  addPoints: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          points: {
            increment: input.amount,
          },
        },
        select: { points: true },
      });
    }),

  consumePoints: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.points < input.amount) {
        throw new Error("ポイントが不足しています");
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          points: {
            decrement: input.amount,
          },
        },
        select: { points: true },
      });
    }),
});
