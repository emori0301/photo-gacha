import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/server";

export const packRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pack.findMany({
      include: {
        packImages: {
          include: {
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pack.findUnique({
        where: { id: input.id },
        include: {
          packImages: {
            include: {
              image: true,
            },
          },
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        price: z.number().optional(),
        packImages: z
          .array(
            z.object({
              imageId: z.string(),
              weight: z.number().min(1).default(1), // 排出率の重み（後方互換性のため残す）
            }),
          )
          .min(1), // 最低1枚以上
        rarityRates: z.string().optional(), // レア度ごとの排出率（JSON形式）
        userId: z.string().optional(), // ポイント付与用
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { packImages, userId, rarityRates, ...packData } = input;
      const pack = await ctx.prisma.pack.create({
        data: {
          ...packData,
          rarityRates: rarityRates || null,
          packImages: {
            create: packImages.map((pi) => ({
              imageId: pi.imageId,
              weight: pi.weight,
            })),
          },
        },
        include: {
          packImages: {
            include: {
              image: true,
            },
          },
        },
      });

      // パック作成時に5ポイント付与
      if (userId) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: 5,
            },
          },
        });
      }

      return pack;
    }),

  openPack: publicProcedure
    .input(
      z.object({
        packId: z.string(),
        userId: z.string(),
        cardCount: z.number().min(1).default(5), // 獲得するカード数
        cost: z.number().default(5), // パック開封に必要なポイント（定数から取得することを推奨）
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // ユーザーのポイントを確認
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { points: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.points < input.cost) {
        throw new Error("ポイントが不足しています");
      }

      // パックを取得
      const pack = await ctx.prisma.pack.findUnique({
        where: { id: input.packId },
        include: {
          packImages: {
            include: {
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

      if (!pack) {
        throw new Error("Pack not found");
      }

      // 排出率に基づいて抽選
      type WeightedImage = {
        image: {
          id: string;
          name: string;
          description: string | null;
          imageUrl: string;
          rarity: string;
          userId: string | null;
        };
        weight: number;
      };

      // レア度ごとの排出率を使用するか、従来のweight方式を使用するか
      let selectedImages: Array<{
        id: string;
        name: string;
        description: string | null;
        imageUrl: string;
        rarity: string;
        userId: string | null;
      }> = [];

      if (pack.rarityRates) {
        // レア度ごとの排出率を使用
        const rarityRates: Record<string, number> = JSON.parse(
          pack.rarityRates,
        );

        // パック内の画像をレア度ごとにグループ化
        const imagesByRarity: Record<
          string,
          (typeof pack.packImages)[0]["image"][]
        > = {};
        pack.packImages.forEach((pi) => {
          const rarity = pi.image.rarity;
          if (!imagesByRarity[rarity]) {
            imagesByRarity[rarity] = [];
          }
          imagesByRarity[rarity].push(pi.image);
        });

        // レア度ごとの排出率に基づいてカードを抽選
        for (let i = 0; i < input.cardCount; i++) {
          // レア度を抽選
          const random = Math.random() * 100;
          let cumulativeRate = 0;
          let selectedRarity: string | null = null;

          for (const [rarity, rate] of Object.entries(rarityRates)) {
            cumulativeRate += rate;
            if (random <= cumulativeRate) {
              selectedRarity = rarity;
              break;
            }
          }

          // 選択されたレア度の画像からランダムに選択
          if (selectedRarity && imagesByRarity[selectedRarity]?.length > 0) {
            const rarityImages = imagesByRarity[selectedRarity];
            const randomIndex = Math.floor(Math.random() * rarityImages.length);
            selectedImages.push(rarityImages[randomIndex]);
          } else {
            // フォールバック: 全画像からランダムに選択
            const allImages = pack.packImages.map((pi) => pi.image);
            const randomIndex = Math.floor(Math.random() * allImages.length);
            selectedImages.push(allImages[randomIndex]);
          }
        }
      } else {
        // 従来のweight方式（後方互換性）
        const weightedImages: WeightedImage[] = pack.packImages.map((pi) => ({
          image: {
            ...pi.image,
            userId: pi.image.userId,
          },
          weight: pi.weight,
        }));

        // 重み付き抽選関数
        const selectWeightedRandom = (
          items: WeightedImage[],
          count: number,
        ): WeightedImage["image"][] => {
          const selected: WeightedImage["image"][] = [];
          const itemsCopy = [...items];

          for (let i = 0; i < count; i++) {
            if (itemsCopy.length === 0) break;

            // 総重みを計算
            const totalWeight = itemsCopy.reduce(
              (sum, item) => sum + item.weight,
              0,
            );

            // ランダムな値を生成
            let random = Math.random() * totalWeight;

            // 重みに基づいて選択
            for (let j = 0; j < itemsCopy.length; j++) {
              random -= itemsCopy[j].weight;
              if (random <= 0) {
                selected.push(itemsCopy[j].image);
                itemsCopy.splice(j, 1);
                break;
              }
            }
          }

          return selected;
        };

        // カードを抽選
        const weightedSelected = selectWeightedRandom(
          weightedImages,
          input.cardCount,
        );
        selectedImages = weightedSelected;
      }

      // ポイントを消費
      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          points: {
            decrement: input.cost,
          },
        },
      });

      // 画像の作成者情報を取得
      const imagesWithCreator = await Promise.all(
        selectedImages.map(async (image) => {
          let creatorName = "不明";
          if (image.userId) {
            const creator = await ctx.prisma.user.findUnique({
              where: { id: image.userId },
              select: { name: true, email: true },
            });
            creatorName =
              creator?.name || creator?.email?.split("@")[0] || "不明";
          }
          return {
            ...image,
            creatorName,
          };
        }),
      );

      // ユーザーのコレクションに追加（枚数をカウント）
      const collectionItems = await Promise.all(
        selectedImages.map((image) =>
          ctx.prisma.userCollection.upsert({
            where: {
              userId_imageId: {
                userId: input.userId,
                imageId: image.id,
              },
            },
            create: {
              userId: input.userId,
              imageId: image.id,
              count: 1,
            },
            update: {
              count: {
                increment: 1,
              },
            },
          }),
        ),
      );

      // 更新後のポイントを取得
      const updatedUser = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { points: true },
      });

      return {
        pack,
        images: imagesWithCreator,
        collectionItems,
        remainingPoints: updatedUser?.points ?? 0,
      };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        price: z.number().optional(),
        packImages: z
          .array(
            z.object({
              imageId: z.string(),
              weight: z.number().min(1).default(1),
            }),
          )
          .min(1)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, packImages, ...updateData } = input;

      // 既存のパック画像を削除してから新しいものを追加
      if (packImages) {
        await ctx.prisma.packImage.deleteMany({
          where: { packId: id },
        });
      }

      return ctx.prisma.pack.update({
        where: { id },
        data: {
          ...updateData,
          ...(packImages && {
            packImages: {
              create: packImages.map((pi) => ({
                imageId: pi.imageId,
                weight: pi.weight,
              })),
            },
          }),
        },
        include: {
          packImages: {
            include: {
              image: true,
            },
          },
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pack.delete({
        where: { id: input.id },
      });
    }),
});
