import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  IMAGE_REWARD_DAILY_LIMIT,
  IMAGE_UPLOAD_REWARD,
} from "@/lib/constants/points";
import { RARITY_LIST } from "@/lib/constants/rarity";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { uploadUrlSchema } from "@/lib/validation";
import { giveBack, grantDailyReward, takeBackReward } from "@/server/points";
import { cleanupUpload } from "@/server/uploads";

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
        bonusGranted: true,
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
      // 自分のアップロードを「使用済み」にできたときだけカードを作る。
      // 条件付きの 1 文なので、同時に送られても 1 枚しか作れない。
      const { count } = await ctx.prisma.upload.updateMany({
        where: { url: input.imageUrl, userId: ctx.userId, used: false },
        data: { used: true },
      });
      if (count === 0) {
        const mine = await ctx.prisma.upload.count({
          where: { url: input.imageUrl, userId: ctx.userId },
        });
        throw new TRPCError(
          mine
            ? {
                code: "CONFLICT",
                message: "この画像はすでにカードになっています",
              }
            : {
                code: "FORBIDDEN",
                message: "自分でアップロードした画像だけをカードにできます",
              },
        );
      }
      let image: Awaited<ReturnType<typeof ctx.prisma.image.create>>;
      try {
        image = await ctx.prisma.image.create({
          data: {
            ...input,
            description: input.description || null,
            userId: ctx.userId,
          },
        });
      } catch (error) {
        await ctx.prisma.upload.updateMany({
          where: { url: input.imageUrl },
          data: { used: false },
        });
        throw error;
      }
      const bonus = await grantDailyReward(
        ctx.prisma,
        ctx.userId,
        "image",
        IMAGE_UPLOAD_REWARD,
        IMAGE_REWARD_DAILY_LIMIT,
      );
      if (bonus > 0) {
        await ctx.prisma.image.update({
          where: { id: image.id },
          data: { bonusGranted: bonus },
        });
      }
      return { ...image, bonusGranted: bonus };
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
          bonusGranted: true,
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
      if (!(await takeBackReward(ctx.prisma, ctx.userId, image.bonusGranted))) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `登録ボーナスの ${image.bonusGranted}pt を返却できないため削除できません。ポイントを貯めてからもう一度どうぞ`,
        });
      }
      // 確認のあとでパックに入った・引かれた場合に備えて、「使われていなければ消す」を 1 文で行う。
      // Turso では外部キー制約が効かないことがあるので、制約には頼らない
      let deleted: number;
      try {
        ({ count: deleted } = await ctx.prisma.image.deleteMany({
          where: {
            id: input.id,
            userId: ctx.userId,
            packImages: { none: {} },
            collections: { none: {} },
          },
        }));
      } catch (error) {
        await giveBack(ctx.prisma, ctx.userId, image.bonusGranted);
        throw error;
      }
      if (deleted === 0) {
        await giveBack(ctx.prisma, ctx.userId, image.bonusGranted);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "使用中の写真なので削除できません",
        });
      }
      await cleanupUpload(ctx.prisma, image.imageUrl);
      return { id: input.id };
    }),
});
