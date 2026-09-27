import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { IMAGE_UPLOAD_REWARD } from "@/lib/constants/points";
import { RARITY_LIST } from "@/lib/constants/rarity";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { uploadUrlSchema } from "@/lib/validation";
import { prismaErrorCode, refundBonusQueries } from "@/server/points";
import { cleanupUpload, ownsUpload } from "@/server/uploads";

const nameSchema = z
  .string()
  .trim()
  .min(1, "タイトルを入力してください")
  .max(40, "タイトルは 40 文字以内にしてください");
const descriptionSchema = z
  .string()
  .trim()
  .max(200, "ひとことは 200 文字以内にしてください")
  .optional();

export const imageRouter = createTRPCRouter({
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.image.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        rarity: true,
        createdAt: true,
        _count: { select: { packImages: true, collections: true } },
      },
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: nameSchema,
        description: descriptionSchema,
        imageUrl: uploadUrlSchema,
        rarity: z.enum(RARITY_LIST),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await ownsUpload(ctx.prisma, ctx.userId, input.imageUrl))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "自分でアップロードした画像だけをカードにできます",
        });
      }
      const [image] = await ctx.prisma.$transaction([
        ctx.prisma.image.create({
          data: {
            ...input,
            description: input.description || null,
            userId: ctx.userId,
          },
        }),
        ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: { points: { increment: IMAGE_UPLOAD_REWARD } },
        }),
      ]);
      return image;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: nameSchema,
        description: descriptionSchema,
        rarity: z.enum(RARITY_LIST),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.prisma.image.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: {
          name: input.name,
          description: input.description || null,
          rarity: input.rarity,
        },
      });
      if (count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "写真が見つかりません",
        });
      }
      return { id: input.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.prisma.image.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: {
          imageUrl: true,
          _count: { select: { packImages: true, collections: true } },
        },
      });
      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "写真が見つかりません",
        });
      }
      if (image._count.packImages > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "パックに入っている写真は削除できません。先にパックから外してください",
        });
      }
      if (image._count.collections > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "誰かがすでに引き当てたカードなので削除できません",
        });
      }
      try {
        await ctx.prisma.$transaction([
          ctx.prisma.image.delete({ where: { id: input.id } }),
          ...refundBonusQueries(ctx.prisma, ctx.userId, IMAGE_UPLOAD_REWARD),
        ]);
      } catch (error) {
        // 確認後にパックへ追加された・引かれた場合は外部キー制約で失敗する
        if (prismaErrorCode(error) === "P2003") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "使用中の写真なので削除できません",
          });
        }
        throw error;
      }
      await cleanupUpload(ctx.prisma, image.imageUrl);
      return { id: input.id };
    }),
});
