-- AlterTable
ALTER TABLE "Image" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");
