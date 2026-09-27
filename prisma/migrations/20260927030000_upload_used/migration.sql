-- AlterTable
ALTER TABLE "Upload" ADD COLUMN "used" BOOLEAN NOT NULL DEFAULT false;

-- すでにカードになっている画像は使用済みにする
UPDATE "Upload" SET "used" = true
WHERE "url" IN (SELECT "imageUrl" FROM "Image");
