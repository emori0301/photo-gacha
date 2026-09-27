import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";

async function png(color: string) {
  return sharp({
    create: { width: 480, height: 600, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function register(page: Page, name: string) {
  const email = `${name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/");
  await page.getByRole("radio", { name: "はじめる" }).click();
  await page.getByLabel("ニックネーム").fill(name);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "登録してはじめる" }).click();
  await expect(page.getByRole("heading", { name: "ガチャ" })).toBeVisible();
  return email;
}

/** 横スクロールが発生していないこと（スマホで崩れていないこと） */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function uploadCard(
  page: Page,
  title: string,
  rarity: string,
  color: string,
) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: `${title}.png`,
      mimeType: "image/png",
      buffer: await png(color),
    });
  await page.getByLabel("タイトル").fill(title);
  await page
    .getByRole("radiogroup", { name: "レア度" })
    .getByRole("radio", { name: rarity, exact: true })
    .click();
  await page.getByRole("button", { name: "カードにする" }).click();
  await expect(page.getByText("カードにしました").first()).toBeVisible();
}

test("登録 → カード作成 → パック作成 → ガチャ → 図鑑", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      errors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  await register(page, "tester");
  await expectNoHorizontalOverflow(page);
  const packName = `パック-${info.project.name}`;

  // 工房でカードを作る
  await page.getByRole("link", { name: "工房" }).first().click();
  await uploadCard(page, "赤い夕日", "UR", "#e0402a");
  await uploadCard(page, "青い海", "N", "#2f6fd0");
  await uploadCard(page, "緑の森", "R", "#2c9a66");
  await expect(
    page.getByRole("heading", { name: /あなたのカード/ }),
  ).toContainText("3");
  await expectNoHorizontalOverflow(page);

  await page.screenshot({
    path: `test-results/${info.project.name}-studio.png`,
    fullPage: true,
  });
  // パックを作る
  await page.getByRole("radio", { name: "パック" }).click();
  await page.getByRole("button", { name: "新しいパック" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("パック名").fill(packName);
  await page.screenshot({
    path: `test-results/${info.project.name}-pack-editor.png`,
  });
  await dialog.getByRole("button", { name: "表示中を全部入れる" }).click();
  await dialog.getByRole("button", { name: "パックを作る" }).click();
  await expect(page.getByText("パックを作りました").first()).toBeVisible();
  await expect(page.getByText(packName)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // ガチャを回す（初期 10pt + 3 + 5 = 18pt）
  await page.getByRole("link", { name: "ガチャ" }).first().click();
  await expect(
    page.getByRole("button", { name: new RegExp(packName) }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `test-results/${info.project.name}-gacha.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "5pt で回す" }).click();
  await page.getByRole("button", { name: "カプセルを開ける" }).click();
  const reveal = page.getByRole("dialog");
  await expect(
    reveal.getByRole("button", { name: "カードをめくる" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-reveal-back.png`,
  });
  // 1 枚目は手でめくり、残りはスキップ
  await reveal.getByRole("button", { name: "めくる", exact: true }).click();
  await expect(
    reveal.getByRole("button", { name: "つぎのカード" }),
  ).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `test-results/${info.project.name}-reveal-front.png`,
  });
  await reveal.getByRole("button", { name: "全部めくる" }).click();
  await expect(reveal.getByText("今回の結果")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `test-results/${info.project.name}-result.png`,
  });
  await expect(
    page.getByRole("link", { name: "ポイントを貯める" }).first(),
  ).toContainText("13");

  // もう一回
  await reveal.getByRole("button", { name: /もう一回/ }).click();
  await page.getByRole("button", { name: "カプセルを開ける" }).click();
  // 開いた直後のスペースは「全部めくる」ではなく 1 枚目をめくる
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "めくる", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "つぎのカード" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "めくる", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "全部めくる" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "図鑑を見る" })
    .click();

  // 図鑑
  await expect(page.getByRole("heading", { name: "図鑑" })).toBeVisible();
  await expect(page.getByText("これまでに")).toContainText("10");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-collection.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /の詳細/ })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByText("持っている枚数"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // ポイント
  await page
    .getByRole("link", { name: "ポイント", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /受け取る/ }).click();
  await expect(
    page.getByRole("button", { name: /受け取り済み/ }),
  ).toBeVisible();
  const shutter = page.getByRole("button", { name: /シャッターを切る/ });
  // 素早く 20 回押しても、2 回目は「現像中」で待ってから受け取れる
  for (let i = 0; i < 20; i++) await shutter.click();
  await expect(page.getByText("今回 +2pt")).toBeVisible({ timeout: 10_000 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-earn.png`,
    fullPage: true,
  });

  expect(errors, errors.join("\n")).toEqual([]);
});

test("ログイン・ログアウト・エラー表示", async ({ page }) => {
  const email = await register(page, "someone");
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(
    page.getByRole("heading", { name: "おかえりなさい" }),
  ).toBeVisible();

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("wrongpassword");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "パスワードが違います",
  );

  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("heading", { name: "ガチャ" })).toBeVisible();

  // 同じメールで再登録はできない
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.getByRole("radio", { name: "はじめる" }).click();
  await page.getByLabel("ニックネーム").fill("dup");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "登録してはじめる" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "すでに登録されています",
  );
});

test("ログイン画面の見た目", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "おかえりなさい" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-login.png`,
  });
});

test("アップロード API は未ログインと非画像を拒否する", async ({ request }) => {
  const res = await request.post("/api/upload", {
    multipart: {
      file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("hi") },
    },
  });
  expect(res.status()).toBe(401);
  const traversal = await request.get("/uploads/..%2F..%2F.env");
  expect(traversal.status()).toBe(404);
});
