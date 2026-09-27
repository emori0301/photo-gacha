import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CARDS_PER_PULL,
  PACK_CREATE_REWARD,
  PACK_OPEN_COST,
} from "@/lib/constants/points";
import { RARITY_LIST, type Rarity } from "@/lib/constants/rarity";
import {
  drawCards,
  effectiveRates,
  highestRarity,
  isValidRarityRates,
  parseRarityRates,
} from "@/lib/gacha";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { uploadUrlSchema } from "@/lib/validation";
import { prismaErrorCode, refundBonusQueries } from "@/server/points";
import { cleanupUpload, ownsUpload } from "@/server/uploads";

const ratesSchema = z
  .object({
    N: z.number().min(0).max(100),
    R: z.number().min(0).max(100),
    SR: z.number().min(0).max(100),
    SSR: z.number().min(0).max(100),
    UR: z.number().min(0).max(100),
  })
  .refine(isValidRarityRates, "排出率の合計を 100% にしてください");

const packInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "パック名を入力してください")
    .max(30, "パック名は 30 文字以内にしてください"),
  description: z
    .string()
    .trim()
    .max(120, "説明は 120 文字以内にしてください")
    .optional(),
  thumbnailUrl: uploadUrlSchema.nullish(),
  imageIds: z
    .array(z.string())
    .min(1, "カードを 1 枚以上選んでください")
    .max(200, "1 パックに入れられるのは 200 枚までです"),
  rarityRates: ratesSchema,
});

async function assertOwnImages(
  prisma: Pick<PrismaClient, "image">,
  userId: string,
  imageIds: string[],
) {
  const unique = [...new Set(imageIds)];
  const owned = await prisma.image.count({
    where: { id: { in: unique }, userId },
  });
  if (owned !== unique.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "自分の写真だけをパックに入れられます",
    });
  }
  return unique;
}

async function assertOwnPack(
  prisma: Pick<PrismaClient, "pack">,
  userId: string,
  packId: string,
) {
  const pack = await prisma.pack.findFirst({
    where: { id: packId, userId },
    select: { id: true, thumbnailUrl: true },
  });
  if (!pack) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "パックが見つかりません",
    });
  }
  return pack;
}

async function assertOwnCover(
  prisma: Parameters<typeof ownsUpload>[0],
  userId: string,
  url: string | null | undefined,
  current?: string | null,
) {
  // 変更しない場合（旧データのカバーなど）はそのまま許可する
  if (!url || url === current) return;
  if (!(await ownsUpload(prisma, userId, url))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "カバーには自分の画像を使ってください",
    });
  }
}

/** 確認後に削除されていた場合（P2025）は NOT_FOUND にする */
function notFoundIfMissing(error: unknown) {
  if (prismaErrorCode(error) === "P2025") {
    return new TRPCError({
      code: "NOT_FOUND",
      message: "パックが見つかりません",
    });
  }
  return error;
}

async function creatorNames(
  prisma: Pick<PrismaClient, "user">,
  ids: (string | null)[],
) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true },
  });
  return new Map(
    users.map((u) => [u.id, u.name || u.email?.split("@")[0] || "名無し"]),
  );
}

export const packRouter = createTRPCRouter({
  /** ガチャ画面に並べるパック（カードが 1 枚以上あるもの） */
  list: protectedProcedure.query(async ({ ctx }) => {
    const packs = await ctx.prisma.pack.findMany({
      where: { packImages: { some: {} } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        rarityRates: true,
        userId: true,
        packImages: {
          select: { image: { select: { id: true, rarity: true } } },
        },
      },
    });
    const allImageIds = [
      ...new Set(packs.flatMap((p) => p.packImages.map((pi) => pi.image.id))),
    ];
    const [owned, names] = await Promise.all([
      ctx.prisma.userCollection.findMany({
        where: { userId: ctx.userId, imageId: { in: allImageIds } },
        select: { imageId: true },
      }),
      creatorNames(
        ctx.prisma,
        packs.map((p) => p.userId),
      ),
    ]);
    const ownedIds = new Set(owned.map((o) => o.imageId));

    return packs.map((pack) => {
      const countByRarity: Partial<Record<Rarity, number>> = {};
      for (const { image } of pack.packImages) {
        countByRarity[image.rarity] = (countByRarity[image.rarity] ?? 0) + 1;
      }
      return {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        thumbnailUrl: pack.thumbnailUrl,
        cardCount: pack.packImages.length,
        ownedCount: pack.packImages.filter((pi) => ownedIds.has(pi.image.id))
          .length,
        countByRarity,
        odds: effectiveRates(
          parseRarityRates(pack.rarityRates),
          Object.keys(countByRarity) as Rarity[],
          countByRarity,
        ),
        isMine: pack.userId === ctx.userId,
        creatorName: (pack.userId && names.get(pack.userId)) || null,
      };
    });
  }),

  /** 工房で編集する自分のパック */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const packs = await ctx.prisma.pack.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        rarityRates: true,
        packImages: { select: { imageId: true } },
      },
    });
    return packs.map(({ packImages, rarityRates, ...pack }) => ({
      ...pack,
      imageIds: packImages.map((pi) => pi.imageId),
      rarityRates: parseRarityRates(rarityRates),
    }));
  }),

  create: protectedProcedure
    .input(packInput)
    .mutation(async ({ ctx, input }) => {
      const imageIds = await assertOwnImages(
        ctx.prisma,
        ctx.userId,
        input.imageIds,
      );
      await assertOwnCover(ctx.prisma, ctx.userId, input.thumbnailUrl);
      const [pack] = await ctx.prisma.$transaction([
        ctx.prisma.pack.create({
          data: {
            name: input.name,
            description: input.description || null,
            thumbnailUrl: input.thumbnailUrl ?? null,
            rarityRates: JSON.stringify(input.rarityRates),
            userId: ctx.userId,
            packImages: { create: imageIds.map((imageId) => ({ imageId })) },
          },
          select: { id: true },
        }),
        ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: { points: { increment: PACK_CREATE_REWARD } },
        }),
      ]);
      return pack;
    }),

  update: protectedProcedure
    .input(packInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const imageIds = await assertOwnImages(
        ctx.prisma,
        ctx.userId,
        input.imageIds,
      );
      const existing = await assertOwnPack(ctx.prisma, ctx.userId, input.id);
      await assertOwnCover(
        ctx.prisma,
        ctx.userId,
        input.thumbnailUrl,
        existing.thumbnailUrl,
      );
      try {
        await ctx.prisma.$transaction([
          ctx.prisma.pack.update({
            where: { id: input.id },
            data: {
              name: input.name,
              description: input.description || null,
              thumbnailUrl: input.thumbnailUrl ?? null,
              rarityRates: JSON.stringify(input.rarityRates),
            },
          }),
          ctx.prisma.packImage.deleteMany({ where: { packId: input.id } }),
          ctx.prisma.packImage.createMany({
            data: imageIds.map((imageId) => ({ packId: input.id, imageId })),
          }),
        ]);
      } catch (error) {
        throw notFoundIfMissing(error);
      }
      if (existing.thumbnailUrl !== (input.thumbnailUrl ?? null)) {
        await cleanupUpload(ctx.prisma, existing.thumbnailUrl);
      }
      return { id: input.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await assertOwnPack(ctx.prisma, ctx.userId, input.id);
      try {
        await ctx.prisma.$transaction([
          ctx.prisma.pack.delete({ where: { id: input.id } }),
          ...refundBonusQueries(ctx.prisma, ctx.userId, PACK_CREATE_REWARD),
        ]);
      } catch (error) {
        throw notFoundIfMissing(error);
      }
      await cleanupUpload(ctx.prisma, existing.thumbnailUrl);
      return { id: input.id };
    }),

  /** ガチャを回す。ポイント消費とコレクション追加は 1 トランザクションで行う。 */
  open: protectedProcedure
    .input(z.object({ packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pack = await ctx.prisma.pack.findUnique({
        where: { id: input.packId },
        select: {
          rarityRates: true,
          packImages: {
            select: {
              image: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  imageUrl: true,
                  rarity: true,
                  userId: true,
                },
              },
            },
          },
        },
      });
      if (!pack || pack.packImages.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "このパックは現在引けません",
        });
      }

      const drawn = drawCards(
        pack.packImages.map((pi) => pi.image),
        parseRarityRates(pack.rarityRates),
        CARDS_PER_PULL,
      );
      const pulls = new Map<string, number>();
      for (const card of drawn)
        pulls.set(card.id, (pulls.get(card.id) ?? 0) + 1);

      // SQLite では対話型トランザクションが同時実行で詰まるため、
      // 「条件付きで 1 文で減算」→「まとめて付与（失敗したら返金）」の順で処理する
      const { count } = await ctx.prisma.user.updateMany({
        where: { id: ctx.userId, points: { gte: PACK_OPEN_COST } },
        data: { points: { decrement: PACK_OPEN_COST } },
      });
      if (count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `ポイントが足りません（${PACK_OPEN_COST}pt 必要）`,
        });
      }

      let before = new Map<string, number>();
      let points = 0;
      try {
        // 同じカードの初入手が同時に起きると一意制約（P2002）で失敗するので再試行する
        for (let attempt = 1; ; attempt++) {
          try {
            const existing = await ctx.prisma.userCollection.findMany({
              where: { userId: ctx.userId, imageId: { in: [...pulls.keys()] } },
              select: { imageId: true, count: true },
            });
            before = new Map(existing.map((e) => [e.imageId, e.count]));
            const results = await ctx.prisma.$transaction([
              ...[...pulls].map(([imageId, n]) =>
                ctx.prisma.userCollection.upsert({
                  where: { userId_imageId: { userId: ctx.userId, imageId } },
                  create: { userId: ctx.userId, imageId, count: n },
                  update: { count: { increment: n } },
                }),
              ),
              ctx.prisma.user.findUniqueOrThrow({
                where: { id: ctx.userId },
                select: { points: true },
              }),
            ]);
            points = (results[results.length - 1] as { points: number }).points;
            break;
          } catch (error) {
            if (prismaErrorCode(error) !== "P2002" || attempt >= 3) throw error;
          }
        }
      } catch (error) {
        await ctx.prisma.user
          .update({
            where: { id: ctx.userId },
            data: { points: { increment: PACK_OPEN_COST } },
          })
          .catch(() => {});
        throw error;
      }

      const names = await creatorNames(
        ctx.prisma,
        drawn.map((c) => c.userId),
      );
      const running = new Map(before);
      const cards = drawn.map((card) => {
        const owned = (running.get(card.id) ?? 0) + 1;
        running.set(card.id, owned);
        return {
          id: card.id,
          name: card.name,
          description: card.description,
          imageUrl: card.imageUrl,
          rarity: card.rarity,
          creatorName: (card.userId && names.get(card.userId)) || null,
          isNew: owned === 1,
          owned,
        };
      });

      return {
        cards,
        best: highestRarity(cards.map((c) => c.rarity)) ?? RARITY_LIST[0],
        points,
      };
    }),
});
