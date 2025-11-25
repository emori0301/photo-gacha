-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PackImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PackImage_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCollection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PackImage_packId_idx" ON "PackImage"("packId");

-- CreateIndex
CREATE UNIQUE INDEX "PackImage_packId_imageId_key" ON "PackImage"("packId", "imageId");

-- CreateIndex
CREATE INDEX "UserCollection_userId_idx" ON "UserCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_userId_imageId_key" ON "UserCollection"("userId", "imageId");
