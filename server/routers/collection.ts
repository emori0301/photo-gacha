import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/server";

export const collectionRouter = createTRPCRouter({
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.userCollection.findMany({
        where: { userId: input.userId },
        include: {
          image: true,
        },
        orderBy: { obtainedAt: "desc" },
      });
    }),

  getStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const collections = await ctx.prisma.userCollection.findMany({
        where: { userId: input.userId },
        include: {
          image: true,
        },
      });

      const totalCount = collections.reduce(
        (sum, c) => sum + (c.count || 1),
        0,
      );
      const uniqueCount = collections.length;

      const stats = {
        total: totalCount, // 総枚数
        unique: uniqueCount, // 種類数
        byRarity: {
          N: 0,
          R: 0,
          SR: 0,
          SSR: 0,
          UR: 0,
        },
      };

      collections.forEach((collection) => {
        const count = collection.count || 1;
        stats.byRarity[
          collection.image.rarity as keyof typeof stats.byRarity
        ] += count;
      });

      return stats;
    }),
});
