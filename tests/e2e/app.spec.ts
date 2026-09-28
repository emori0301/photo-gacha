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
  // 前のカードのトーストが残っていると上の確認はすぐ通るので、送信が終わってフォームが空になるまで待つ
  await expect(page.getByLabel("タイトル")).toHaveValue("");
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

test("空白の無い長いタイトルでもダイアログからはみ出さない", async ({
  page,
}) => {
  await register(page, "longname");
  await page.getByRole("link", { name: "工房" }).first().click();
  const title = "PXL_20250921_093012345_MP_PORTRAIT_ORIGI";
  await uploadCard(page, title, "N", "#8c867e");
  await page.getByRole("button", { name: "編集" }).first().click();
  const heading = page.getByRole("dialog").getByRole("heading");
  await expect(heading).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "やめる" })
    .click();
  await page.getByRole("button", { name: `${title} を削除` }).click();
  const confirm = page.getByRole("dialog");
  const fits = await confirm.evaluate((el) => {
    const t = el.querySelector("h2") as HTMLElement;
    return (
      t.scrollWidth <= t.clientWidth + 1 &&
      t.getBoundingClientRect().right <= el.getBoundingClientRect().right
    );
  });
  expect(fits).toBe(true);
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

test("ホーム画面に追加できる（マニフェスト・アイコン・オフライン画面）", async ({
  page,
  context,
  request,
}) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toContain(
    "maskable",
  );
  for (const src of [
    ...manifest.icons.map((i: { src: string }) => i.src),
    "/apple-icon.png",
  ]) {
    const icon = await request.get(src);
    expect(icon.ok(), src).toBe(true);
    expect(icon.headers()["content-type"], src).toBe("image/png");
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  // Service Worker が動き出したら、電波が無くてもブラウザのエラー画面ではなくオフライン画面が出る
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "オフラインです" }),
  ).toBeVisible();
  // つながったら元の画面に戻る
  await context.setOffline(false);
  await expect(
    page.getByRole("heading", { name: "おかえりなさい" }),
  ).toBeVisible();
});

test("インストールできるブラウザでは、追加の案内から確認を出せる", async ({
  page,
}) => {
  await register(page, "installer");
  const banner = page.getByRole("complementary", { name: "アプリとして使う" });
  await expect(banner).toBeHidden();

  // Chrome が出す beforeinstallprompt の代わり
  const offerInstall = () =>
    page.evaluate(() => {
      const event = Object.assign(
        new Event("beforeinstallprompt", { cancelable: true }),
        {
          prompt: async () => {
            (window as { prompted?: boolean }).prompted = true;
          },
          userChoice: Promise.resolve({ outcome: "accepted" }),
        },
      );
      window.dispatchEvent(event);
    });

  await offerInstall();
  await expect(banner).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await banner.getByRole("button", { name: "追加する" }).click();
  await expect(banner).toBeHidden();
  expect(
    await page.evaluate(() => (window as { prompted?: boolean }).prompted),
  ).toBe(true);

  // 読み込み直して、画面が動き出す（ポイントが表示される）まで待つ
  const reload = async () => {
    await page.reload();
    await expect(
      page.getByRole("link", { name: /所持ポイント \d+pt/ }),
    ).toBeVisible();
  };

  // 閉じたら、次に開いたときも出さない
  await reload();
  await offerInstall();
  await banner.getByRole("button", { name: "案内を閉じる" }).click();
  await expect(banner).toBeHidden();
  await reload();
  await offerInstall();
  await expect(banner).toBeHidden();
});

test.describe("iPhone", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  });

  test("共有メニューから追加する手順を案内する", async ({ page }, info) => {
    await register(page, "iphone");
    const banner = page.getByRole("complementary", {
      name: "アプリとして使う",
    });
    await banner.getByRole("button", { name: "追加する" }).click();
    const steps = page.getByRole("dialog", { name: "ホーム画面に追加する" });
    await expect(steps.getByText("「ホーム画面に追加」")).toBeVisible();
    await page.screenshot({
      path: `test-results/${info.project.name}-install-ios.png`,
    });
    await steps.getByRole("button", { name: "閉じる" }).click();
    await expect(banner).toBeVisible();
  });
});
