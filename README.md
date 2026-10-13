# PhotoGacha

撮った写真が、ガチャになる。
写真をカードにして、パックに詰めて、みんなで引き合うアプリです。

- **ガチャ** — パックを選んでハンドルを回すと、カプセルが出てきます。カプセルの色は中身の最高レア度のヒントで、SSR 以上ならドームが虹色に光ります。タップして開けたら 1 枚ずつめくります（スペースキーでも OK）。
- **図鑑** — 引いたカードの一覧とコンプリート率。レア度で絞り込み、検索、並び替え、画像の保存ができます。
- **工房** — 写真をカードにする（レア度つき）／自分のカードでパックを作る（排出率を設定）。
- **ポイント** — ログインボーナスと、シャッター連打のミニゲーム。

## アプリとして使う（ホーム画面に追加）

ストアを通さずに、スマホのホーム画面へアイコンを置いて、アプリのように全画面で開けます（PWA）。

- **iPhone / iPad** — Safari で開き、共有ボタン →「ホーム画面に追加」。アプリ内に手順の案内も出ます。
- **Android** — Chrome で開くと画面下に「アプリとして使う」が出るので「追加する」（Chrome のメニューの「アプリをインストール」でも可）。
- **PC** — Chrome / Edge のアドレスバーにあるインストールのボタンから。

スマホでアプリとして使うには、HTTPS で公開されている必要があります（`http://192.168.…` のような LAN 内のアドレスでは、インストールやオフライン画面が動きません）。

## インターネットに公開する（Vercel・無料）

アプリ本体と写真は [Vercel](https://vercel.com)、カードやポイントのデータは [Turso](https://turso.tech) に置きます。どちらも無料プランで使え、クレジットカードは要りません。

1. **Vercel に登録する** — 「Sign Up」から GitHub アカウントでログインし、Hobby（無料）プランを選ぶ。
2. **プロジェクトを作る** — 「Add New…」→「Project」→ このリポジトリを「Import」。
   「Environment Variables」に `NEXTAUTH_SECRET`（長いランダムな文字列。例: `openssl rand -base64 32` の結果）を追加して「Deploy」。
   **1 回目はデータベースがまだ無いので失敗しますが、そのままで大丈夫です。**
3. **データベースをつなぐ** — プロジェクトの「Storage」タブ →「Create Database」→「Turso」。地域を選べるときは Tokyo（ap-northeast-1）。作ったらこのプロジェクトにつなぐ（`TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` が自動で入ります）。
4. **写真の置き場をつなぐ** — 同じ「Storage」タブ →「Create」→「Blob」。公開設定は **Public** を選び、このプロジェクトにつなぐ（`BLOB_READ_WRITE_TOKEN` が自動で入ります）。
5. **もう一度デプロイする** — 「Deployments」タブで最新のものの「…」→「Redeploy」。ビルドの途中でテーブルが作られます。
6. 表示された `https://<プロジェクト名>.vercel.app` を開けば完成です。スマホで開いて「ホーム画面に追加」すれば、アプリとして使えます。

- 以降は `main` に push するたびに自動で更新されます。データベースの変更（`prisma/migrations`）も、そのときに当たります（`npm run db:migrate:turso`）。
- `NEXTAUTH_URL` は Vercel では設定しません（開いたアドレスを自動で使います）。
- サーバーの処理は東京で動きます（`vercel.json` の `regions`）。Turso も東京にすると速くなります。
- 無料の範囲: Vercel の Hobby プランは個人・趣味での利用に限られます。写真は 1GB まで（縮めてから保存するので数千枚）、データは 5GB まで。上限を超えると止まりますが、勝手に有料にはなりません。

## セットアップ

```bash
cp .env.example .env   # NEXTAUTH_SECRET を書き換える
npm install            # Prisma Client も生成されます
npm run db:migrate     # SQLite にテーブルを作成
npm run dev            # http://localhost:3000
```

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | Biome（lint + format チェック） |
| `npm run typecheck` | TypeScript |
| `npm test` | 抽選ロジック・API のテスト（Vitest、一時 DB を使用） |
| `npm run test:e2e` | ブラウザでの通しテスト（Playwright、要 `npm run build`） |
| `npm run db:migrate:turso` | 公開先のデータベース（Turso）にテーブルを作る・更新する（Vercel ではビルド時に自動で実行） |
| `npm run user:set-password -- <email> <password>` | 管理者がパスワードを設定する |
| `npm run icons` | アプリのアイコン（ホーム画面・ファビコン）を作り直す |

## ポイントのルール

| 操作 | ポイント |
| --- | --- |
| 新規登録 | +10 |
| ガチャ 1 回（5 枚） | −5 |
| 写真をカードにする（1 日 10 回まで） | +1（削除で返却） |
| パックを作る（1 日 3 回まで） | +5（削除で返却） |
| ログインボーナス（日本時間で 1 日 1 回） | +5 |
| シャッター 10 回（1 日 30 回まで） | +1 |

## 仕組みのメモ

- 排出率はレア度ごとに設定します。パックに入っていないレア度の枠は、入っているレア度に按分されます（ガチャ画面の「提供割合」は按分後の値）。
- ポイントの消費は条件付きの 1 文（`points >= 5` のときだけ減算）で行うため、連打しても残高以上は引けません。
- 引かれたカード・パックに入っているカードは削除できません（引いた人の図鑑を壊さないため）。
- 削除時は受け取ったボーナスを返却します。返却分のポイントが足りない場合は削除できません（作成→引く→削除の繰り返しでポイントを稼げないように）。同じ画像から 2 枚目のカードは作れません。
- データベースは SQLite 互換の libSQL です。手元では SQLite のファイル、公開先では Turso に、同じアダプター（`lib/prisma.ts`）でつなぎます。テーブルを変えるときは手元で `npx prisma migrate dev` を使い、できた `prisma/migrations` の SQL を Vercel のビルド時に `scripts/migrate-turso.ts` が Turso に当てます。
- アップロード画像は、手元では `data/uploads/`（`UPLOAD_DIR`）に保存して `/uploads/[filename]` から配信し、Vercel では Vercel Blob に保存します。形式はファイルの中身で判定し、SVG は受け付けません。
- 写真は送る前にブラウザで長い辺 1440px まで縮めます（Vercel は 4.5MB を超えるリクエストを受け付けないため。表示も速くなります）。
- ホーム画面用の設定は `app/manifest.ts`、アイコンは `scripts/generate-icons.ts` で作ります（ロゴを変えたら `npm run icons`）。
- Service Worker（`public/sw.js`）は、電波が無いときに `public/offline.html` を出すためだけに使い、ページや API はキャッシュしません（ポイントやカードは常にサーバーの最新を使う）。`offline.html` を変えたら `sw.js` の `CACHE` の番号を上げてください。登録は本番ビルド（`npm run build && npm start`）のときだけです。

## 以前のバージョンからの移行

`npm run db:migrate` で次の変更が入ります。

- パスワードでのログインに変わりました。以前のアカウントにはパスワードが無いため、`npm run user:set-password` で設定してください（本人確認ができないため、登録画面からの引き継ぎはできません）。
- メールアドレスは小文字で照合します。既存データも小文字にそろえます。
- 以前 `public/uploads/` に保存された画像はそのまま表示されます。
- 作成者が記録されていない以前のパックは、ガチャには並びますが編集・削除はできません。
