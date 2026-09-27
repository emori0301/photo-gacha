-- AlterTable
ALTER TABLE "Image" ADD COLUMN "bonusGranted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Pack" ADD COLUMN "bonusGranted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "imageRewardDay" DATETIME;
ALTER TABLE "User" ADD COLUMN "imageRewardCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "packRewardDay" DATETIME;
ALTER TABLE "User" ADD COLUMN "packRewardCount" INTEGER NOT NULL DEFAULT 0;

-- これまでに作られたものはボーナスを受け取り済みとして扱う
UPDATE "Image" SET "bonusGranted" = 1 WHERE "userId" IS NOT NULL;
UPDATE "Pack" SET "bonusGranted" = 5 WHERE "userId" IS NOT NULL;
