-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RaceResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "spins" INTEGER NOT NULL DEFAULT 0,
    "startPosition" INTEGER,
    "carColorId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RaceResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RaceResult_carColorId_fkey" FOREIGN KEY ("carColorId") REFERENCES "CarColor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Everyone finishes in Heat: former retirements go to the back of their race
-- (in grid order) and count as one spin-out; they score from the season's table
INSERT INTO "new_RaceResult" ("id", "raceId", "userId", "position", "spins", "startPosition", "carColorId", "points", "notes", "createdAt", "updatedAt")
SELECT "id", "raceId", "userId", "position", 0, "startPosition", "carColorId", "points", "notes", "createdAt", "updatedAt"
FROM "RaceResult" WHERE "position" IS NOT NULL;
INSERT INTO "new_RaceResult" ("id", "raceId", "userId", "position", "spins", "startPosition", "carColorId", "points", "notes", "createdAt", "updatedAt")
SELECT r."id", r."raceId", r."userId",
    (SELECT count(*) FROM "RaceResult" f WHERE f."raceId" = r."raceId" AND f."position" IS NOT NULL)
        + row_number() OVER (PARTITION BY r."raceId" ORDER BY r."startPosition" IS NULL, r."startPosition", r."id"),
    1, r."startPosition", r."carColorId", 0, r."notes", r."createdAt", r."updatedAt"
FROM "RaceResult" r WHERE r."position" IS NULL;
UPDATE "new_RaceResult" SET "points" = coalesce((
    SELECT json_extract(s."pointsTable", '$[' || ("new_RaceResult"."position" - 1) || ']')
    FROM "Race" ra JOIN "Season" s ON s."id" = ra."seasonId"
    WHERE ra."id" = "new_RaceResult"."raceId" AND ra."status" = 'FINISHED'
), 0)
WHERE "spins" = 1 AND "id" IN (SELECT "id" FROM "RaceResult" WHERE "position" IS NULL);
DROP TABLE "RaceResult";
ALTER TABLE "new_RaceResult" RENAME TO "RaceResult";
CREATE INDEX "RaceResult_userId_idx" ON "RaceResult"("userId");
CREATE UNIQUE INDEX "RaceResult_raceId_userId_key" ON "RaceResult"("raceId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
