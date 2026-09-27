-- AlterTable
ALTER TABLE "Pack" ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "lastTapRewardAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastDailyBonusAt" DATETIME;

-- CreateIndex
CREATE INDEX "Pack_userId_idx" ON "Pack"("userId");
