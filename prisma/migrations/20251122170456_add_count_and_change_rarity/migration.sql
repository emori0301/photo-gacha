-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCollection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserCollection" ("id", "imageId", "obtainedAt", "userId") SELECT "id", "imageId", "obtainedAt", "userId" FROM "UserCollection";
DROP TABLE "UserCollection";
ALTER TABLE "new_UserCollection" RENAME TO "UserCollection";
CREATE INDEX "UserCollection_userId_idx" ON "UserCollection"("userId");
CREATE UNIQUE INDEX "UserCollection_userId_imageId_key" ON "UserCollection"("userId", "imageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
