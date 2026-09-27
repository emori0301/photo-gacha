import { RARITY_LIST, type Rarity } from "@/lib/constants/rarity";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { creatorNames } from "@/server/users";

export const collectionRouter = createTRPCRouter({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.prisma.userCollection.findMany({
      where: { userId: ctx.userId },
      orderBy: { obtainedAt: "desc" },
      select: {
        id: true,
        count: true,
        obtainedAt: true,
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
    });

    const creatorName = await creatorNames(
      ctx.prisma,
      items.map((i) => i.image.userId),
    );

    return items.map(({ image, ...item }) => ({
      ...item,
      image: {
        id: image.id,
        name: image.name,
        description: image.description,
        imageUrl: image.imageUrl,
        rarity: image.rarity,
        creatorName: (image.userId && creatorName.get(image.userId)) || null,
      },
    }));
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [owned, catalog, ownedInCatalog] = await Promise.all([
      ctx.prisma.userCollection.findMany({
        where: { userId: ctx.userId },
        select: { count: true, image: { select: { rarity: true } } },
      }),
      // 図鑑の分母: いずれかのパックに入っているカード
      ctx.prisma.image.count({ where: { packImages: { some: {} } } }),
      ctx.prisma.userCollection.count({
        where: { userId: ctx.userId, image: { packImages: { some: {} } } },
      }),
    ]);

    const byRarity = Object.fromEntries(
      RARITY_LIST.map((r) => [r, 0]),
    ) as Record<Rarity, number>;
    let total = 0;
    for (const item of owned) {
      byRarity[item.image.rarity] += item.count;
      total += item.count;
    }
    return { total, unique: owned.length, catalog, ownedInCatalog, byRarity };
  }),
});
