import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/server";

export const imageRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.image.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.image.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.image.findUnique({
        where: { id: input.id },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        imageUrl: z.string(),
        rarity: z.enum(["N", "R", "SR", "SSR", "UR"]),
        userId: z.string().optional(), // ポイント付与用と画像所有者
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...imageData } = input;
      const image = await ctx.prisma.image.create({
        data: {
          ...imageData,
          userId: userId || null,
        },
      });

      // 画像登録時に1ポイント付与
      if (userId) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: 1,
            },
          },
        });
      }

      return image;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.image.delete({
        where: { id: input.id },
      });
    }),
});
