-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Upload_url_key" ON "Upload"("url");

-- CreateIndex
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tapRewardDay" DATETIME;
ALTER TABLE "User" ADD COLUMN "tapRewardCount" INTEGER NOT NULL DEFAULT 0;

-- 既存の画像の持ち主をアップロードの持ち主として登録する
INSERT OR IGNORE INTO "Upload" ("id", "url", "userId")
SELECT 'legacy_' || "id", "imageUrl", "userId" FROM "Image" WHERE "userId" IS NOT NULL;

-- メールアドレスは小文字で照合するようになったため、既存データも小文字にそろえる
-- （小文字にすると他のアカウントと重複するものはそのまま残す）
UPDATE "User" SET "email" = lower(trim("email"))
WHERE "email" IS NOT NULL
  AND "email" <> lower(trim("email"))
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS other
    WHERE other."id" <> "User"."id" AND lower(trim(other."email")) = lower(trim("User"."email"))
  );
