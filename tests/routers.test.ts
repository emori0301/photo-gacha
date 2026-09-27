import { beforeEach, describe, expect, it } from "vitest";
import {
  CARDS_PER_PULL,
  DAILY_BONUS,
  IMAGE_UPLOAD_REWARD,
  PACK_CREATE_REWARD,
  PACK_OPEN_COST,
  TAP_DAILY_LIMIT,
  TAP_REWARD,
} from "@/lib/constants/points";
import { DEFAULT_RARITY_RATES, type Rarity } from "@/lib/constants/rarity";
import { prisma } from "@/lib/prisma";
import { createCallerFactory } from "@/lib/trpc/server";
import { appRouter } from "@/server/routers/_app";

const createCaller = createCallerFactory(appRouter);

async function makeUser(name: string, points = 100) {
  const user = await prisma.user.create({
    data: { name, email: `${name}-${Math.random()}@example.com`, points },
  });
  return { user, api: createCaller({ prisma, userId: user.id }) };
}

async function points(userId: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
    .points;
}

type Api = Awaited<ReturnType<typeof makeUser>>["api"];

/** /api/upload を通したのと同じ状態（持ち主つきのアップロード）を作る */
async function fakeUpload(userId: string) {
  const url = `/uploads/test-${Math.random().toString(36).slice(2)}.png`;
  await prisma.upload.create({ data: { url, userId } });
  return url;
}

async function addPhotos(api: Api, rarities: Rarity[]) {
  const { id: userId } = await api.user.me();
  const photos = [];
  for (const [i, rarity] of rarities.entries()) {
    photos.push(
      await api.image.create({
        name: `photo ${i}`,
        imageUrl: await fakeUpload(userId),
        rarity,
      }),
    );
  }
  return photos;
}

beforeEach(async () => {
  await prisma.upload.deleteMany();
  await prisma.userCollection.deleteMany();
  await prisma.packImage.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.image.deleteMany();
  await prisma.user.deleteMany();
});

describe("認証", () => {
  it("未ログインでは保護された API を呼べない", async () => {
    const guest = createCaller({ prisma, userId: null });
    await expect(guest.user.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(guest.pack.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("image", () => {
  it("登録でボーナス、削除で返却される", async () => {
    const { user, api } = await makeUser("alice", 0);
    const [photo] = await addPhotos(api, ["N"]);
    expect(await points(user.id)).toBe(IMAGE_UPLOAD_REWARD);
    await api.image.delete({ id: photo.id });
    expect(await points(user.id)).toBe(0);
  });

  it("返却でポイントがマイナスにならない", async () => {
    const { user, api } = await makeUser("alice", 0);
    const [photo] = await addPhotos(api, ["N"]);
    await prisma.user.update({ where: { id: user.id }, data: { points: 0 } });
    await api.image.delete({ id: photo.id });
    expect(await points(user.id)).toBe(0);
  });

  it("不正な画像パスは拒否する", async () => {
    const { api } = await makeUser("alice");
    for (const imageUrl of [
      "https://evil.example/x.png",
      "/uploads/../.env",
      "/uploads/a/b.png",
      "javascript:alert(1)",
    ]) {
      await expect(
        api.image.create({ name: "x", imageUrl, rarity: "N" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
  });

  it("他人がアップロードした画像はカードにもカバーにもできない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const aliceUrl = await fakeUpload(alice.user.id);
    await expect(
      bob.api.image.create({ name: "steal", imageUrl: aliceUrl, rarity: "UR" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const [bobPhoto] = await addPhotos(bob.api, ["N"]);
    await expect(
      bob.api.pack.create({
        name: "p",
        imageIds: [bobPhoto.id],
        rarityRates: DEFAULT_RARITY_RATES,
        thumbnailUrl: aliceUrl,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // 自分のカードの画像はカバーにできる
    await bob.api.pack.create({
      name: "p",
      imageIds: [bobPhoto.id],
      rarityRates: DEFAULT_RARITY_RATES,
      thumbnailUrl: bobPhoto.imageUrl,
    });
  });

  it("削除時、他で使われている画像のアップロード記録は残す", async () => {
    const { user, api } = await makeUser("alice");
    const [photo] = await addPhotos(api, ["N"]);
    const other = await api.image.create({
      name: "same",
      imageUrl: photo.imageUrl,
      rarity: "R",
    });
    await api.image.delete({ id: photo.id });
    expect(
      await prisma.upload.count({
        where: { url: photo.imageUrl, userId: user.id },
      }),
    ).toBe(1);
    await api.image.delete({ id: other.id });
    expect(await prisma.upload.count({ where: { url: photo.imageUrl } })).toBe(
      0,
    );
  });

  it("他人の写真は編集・削除できない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const [photo] = await addPhotos(alice.api, ["N"]);
    await expect(
      bob.api.image.update({ id: photo.id, name: "hack", rarity: "UR" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(bob.api.image.delete({ id: photo.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("パックに入っている写真は削除できない", async () => {
    const { api } = await makeUser("alice");
    const [photo] = await addPhotos(api, ["N"]);
    await api.pack.create({
      name: "p",
      imageIds: [photo.id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await expect(api.image.delete({ id: photo.id })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});

describe("pack", () => {
  it("作成でボーナス、削除で返却", async () => {
    const { user, api } = await makeUser("alice", 0);
    const photos = await addPhotos(api, ["N", "R"]);
    const before = await points(user.id);
    const pack = await api.pack.create({
      name: "summer",
      imageIds: photos.map((p) => p.id),
      rarityRates: DEFAULT_RARITY_RATES,
    });
    expect(await points(user.id)).toBe(before + PACK_CREATE_REWARD);
    await api.pack.delete({ id: pack.id });
    expect(await points(user.id)).toBe(before);
  });

  it("排出率の合計が 100 でないと作れない", async () => {
    const { api } = await makeUser("alice");
    const [photo] = await addPhotos(api, ["N"]);
    await expect(
      api.pack.create({
        name: "bad",
        imageIds: [photo.id],
        rarityRates: { N: 50, R: 0, SR: 0, SSR: 0, UR: 0 },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他人の写真はパックに入れられない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const [photo] = await addPhotos(alice.api, ["N"]);
    await expect(
      bob.api.pack.create({
        name: "steal",
        imageIds: [photo.id],
        rarityRates: DEFAULT_RARITY_RATES,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他人のパックは編集・削除できない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const [photo] = await addPhotos(alice.api, ["N"]);
    const [bobPhoto] = await addPhotos(bob.api, ["N"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: [photo.id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await expect(
      bob.api.pack.update({
        id: pack.id,
        name: "x",
        imageIds: [bobPhoto.id],
        rarityRates: DEFAULT_RARITY_RATES,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bob.api.pack.delete({ id: pack.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await prisma.packImage.count({ where: { packId: pack.id } })).toBe(
      1,
    );
  });

  it("更新でカードの入れ替えができる（重複 ID はまとめる）", async () => {
    const { api } = await makeUser("alice");
    const photos = await addPhotos(api, ["N", "R", "SR"]);
    const pack = await api.pack.create({
      name: "p",
      imageIds: [photos[0].id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await api.pack.update({
      id: pack.id,
      name: "p2",
      imageIds: [photos[1].id, photos[2].id, photos[2].id],
      rarityRates: DEFAULT_RARITY_RATES,
      thumbnailUrl: null,
    });
    const [mine] = await api.pack.mine();
    expect(mine.name).toBe("p2");
    expect(new Set(mine.imageIds)).toEqual(
      new Set([photos[1].id, photos[2].id]),
    );
  });

  it("一覧には提供割合とコンプ状況が入る", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const photos = await addPhotos(alice.api, ["N", "UR"]);
    await alice.api.pack.create({
      name: "p",
      imageIds: photos.map((p) => p.id),
      rarityRates: DEFAULT_RARITY_RATES,
    });
    const [listed] = await bob.api.pack.list();
    expect(listed.cardCount).toBe(2);
    expect(listed.ownedCount).toBe(0);
    expect(listed.isMine).toBe(false);
    expect(listed.creatorName).toBe("alice");
    expect((listed.odds.N ?? 0) + (listed.odds.UR ?? 0)).toBeCloseTo(100);
  });
});

describe("pack.open", () => {
  it("ポイントを消費してカードをコレクションに追加する", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob", PACK_OPEN_COST);
    const photos = await addPhotos(alice.api, ["N", "R", "SR", "SSR", "UR"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: photos.map((p) => p.id),
      rarityRates: DEFAULT_RARITY_RATES,
    });

    const result = await bob.api.pack.open({ packId: pack.id });
    expect(result.cards).toHaveLength(CARDS_PER_PULL);
    expect(result.points).toBe(0);
    expect(await points(bob.user.id)).toBe(0);

    const owned = await prisma.userCollection.findMany({
      where: { userId: bob.user.id },
    });
    const total = owned.reduce((s, o) => s + o.count, 0);
    expect(total).toBe(CARDS_PER_PULL);
    // 初登場のカードだけ NEW
    const seen = new Set<string>();
    for (const c of result.cards) {
      expect(c.isNew).toBe(!seen.has(c.id));
      seen.add(c.id);
    }
    expect(result.cards.every((c) => c.creatorName === "alice")).toBe(true);
  });

  it("ポイント不足なら何も起きない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob", PACK_OPEN_COST - 1);
    const [photo] = await addPhotos(alice.api, ["N"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: [photo.id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await expect(bob.api.pack.open({ packId: pack.id })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(await points(bob.user.id)).toBe(PACK_OPEN_COST - 1);
    expect(
      await prisma.userCollection.count({ where: { userId: bob.user.id } }),
    ).toBe(0);
  });

  it("同時に連打しても残高以上は引けない", { timeout: 60_000 }, async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob", PACK_OPEN_COST * 2);
    const [photo] = await addPhotos(alice.api, ["N"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: [photo.id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => bob.api.pack.open({ packId: pack.id })),
    );
    console.log(
      results.map((r) =>
        r.status === "rejected" ? String(r.reason).slice(0, 300) : "ok",
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await points(bob.user.id)).toBe(0);
    const owned = await prisma.userCollection.findFirstOrThrow({
      where: { userId: bob.user.id },
    });
    expect(owned.count).toBe(CARDS_PER_PULL * 2);
  });

  it("存在しないパックは NOT_FOUND", async () => {
    const { api } = await makeUser("bob");
    await expect(api.pack.open({ packId: "nope" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("引かれたカードは作者でも削除できない", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const [photo] = await addPhotos(alice.api, ["N"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: [photo.id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await bob.api.pack.open({ packId: pack.id });
    await alice.api.pack.delete({ id: pack.id });
    await expect(
      alice.api.image.delete({ id: photo.id }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    // パックを消しても引いた人の図鑑には残る
    expect(await bob.api.collection.mine()).toHaveLength(1);
  });
});

describe("collection.stats", () => {
  it("コンプ率の分子は現在パックにあるカードだけ", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const photos = await addPhotos(alice.api, ["N", "N"]);
    const pack = await alice.api.pack.create({
      name: "p",
      imageIds: [photos[0].id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    await bob.api.pack.open({ packId: pack.id });
    await alice.api.pack.update({
      id: pack.id,
      name: "p",
      imageIds: [photos[1].id],
      rarityRates: DEFAULT_RARITY_RATES,
    });
    const stats = await bob.api.collection.stats();
    expect(stats.catalog).toBe(1);
    expect(stats.ownedInCatalog).toBe(0);
    expect(stats.unique).toBe(1);
    expect(stats.total).toBe(CARDS_PER_PULL);
    expect(stats.byRarity.N).toBe(CARDS_PER_PULL);
  });
});

describe("user", () => {
  it("シャッター報酬は連続では受け取れない", async () => {
    const { user, api } = await makeUser("alice", 0);
    await api.user.tapReward();
    expect(await points(user.id)).toBe(TAP_REWARD);
    await expect(api.user.tapReward()).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastTapRewardAt: new Date(Date.now() - 5000) },
    });
    await api.user.tapReward();
    expect(await points(user.id)).toBe(TAP_REWARD * 2);
  });

  it("シャッター報酬は 1 日の上限まで", async () => {
    const { user, api } = await makeUser("alice", 0);
    const first = await api.user.tapReward();
    expect(first.tapRewardsLeft).toBe(TAP_DAILY_LIMIT - 1);
    const day = (
      await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    ).tapRewardDay as Date;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tapRewardCount: TAP_DAILY_LIMIT,
        lastTapRewardAt: new Date(Date.now() - 60_000),
      },
    });
    await expect(api.user.tapReward()).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect((await api.user.me()).tapRewardsLeft).toBe(0);
    // 翌日になればリセットされる
    await prisma.user.update({
      where: { id: user.id },
      data: { tapRewardDay: new Date(day.getTime() - 86_400_000) },
    });
    await api.user.tapReward();
    expect((await api.user.me()).tapRewardsLeft).toBe(TAP_DAILY_LIMIT - 1);
  });

  it("ログインボーナスは 1 日 1 回", async () => {
    const { user, api } = await makeUser("alice", 0);
    expect((await api.user.me()).dailyBonusAvailable).toBe(true);
    await api.user.claimDailyBonus();
    expect(await points(user.id)).toBe(DAILY_BONUS);
    expect((await api.user.me()).dailyBonusAvailable).toBe(false);
    await expect(api.user.claimDailyBonus()).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const results = await Promise.allSettled([
      api.user.claimDailyBonus(),
      api.user.claimDailyBonus(),
    ]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });
});
