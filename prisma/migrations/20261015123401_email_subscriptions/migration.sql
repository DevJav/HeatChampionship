-- CreateTable
CREATE TABLE "EmailBroadcast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "username" TEXT,
    "displayUsername" TEXT,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" DATETIME,
    "bio" TEXT,
    "favoriteColorId" TEXT,
    "contactEmail" TEXT,
    "emailTopics" TEXT NOT NULL DEFAULT '',
    "emailToken" TEXT,
    CONSTRAINT "user_favoriteColorId_fkey" FOREIGN KEY ("favoriteColorId") REFERENCES "CarColor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user" ("banExpires", "banReason", "banned", "bio", "createdAt", "displayUsername", "email", "emailVerified", "favoriteColorId", "id", "image", "name", "role", "updatedAt", "username") SELECT "banExpires", "banReason", "banned", "bio", "createdAt", "displayUsername", "email", "emailVerified", "favoriteColorId", "id", "image", "name", "role", "updatedAt", "username" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
CREATE UNIQUE INDEX "user_emailToken_key" ON "user"("emailToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailBroadcast_key_key" ON "EmailBroadcast"("key");
