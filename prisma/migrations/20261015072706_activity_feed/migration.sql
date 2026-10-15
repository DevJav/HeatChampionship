-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "raceId" TEXT,
    "seasonId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_raceId_type_idx" ON "Activity"("raceId", "type");

-- Backfill the feed from what already happened. Dates are copied as stored.
INSERT INTO "Activity" ("id", "type", "actorId", "createdAt")
SELECT lower(hex(randomblob(12))), 'PLAYER_JOINED', "id", "createdAt" FROM "user";

INSERT INTO "Activity" ("id", "type", "raceId", "createdAt")
SELECT lower(hex(randomblob(12))), 'RACE_ANNOUNCED', "id", "createdAt" FROM "Race" WHERE "status" <> 'DRAFT';

INSERT INTO "Activity" ("id", "type", "actorId", "raceId", "createdAt")
SELECT lower(hex(randomblob(12))), 'RACE_SIGNUP', "userId", "raceId", "createdAt" FROM "Registration" WHERE "status" <> 'WITHDRAWN';

INSERT INTO "Activity" ("id", "type", "raceId", "createdAt")
SELECT lower(hex(randomblob(12))), 'RESULTS_PUBLISHED', "id", "finalizedAt" FROM "Race"
WHERE "status" = 'FINISHED' AND "finalizedAt" IS NOT NULL;

INSERT INTO "Activity" ("id", "type", "actorId", "raceId", "createdAt")
SELECT lower(hex(randomblob(12))), 'PHOTOS_ADDED', "uploadedById", "raceId", max("createdAt") FROM "RacePhoto"
WHERE "uploadedById" IS NOT NULL GROUP BY "uploadedById", "raceId";

INSERT INTO "Activity" ("id", "type", "seasonId", "createdAt")
SELECT lower(hex(randomblob(12))), 'SEASON_STARTED', "id", "createdAt" FROM "Season" WHERE "status" <> 'UPCOMING';

-- A finished season ends with its last results
INSERT INTO "Activity" ("id", "type", "seasonId", "createdAt")
SELECT lower(hex(randomblob(12))), 'SEASON_FINISHED', s."id", max(r."finalizedAt") FROM "Season" s
JOIN "Race" r ON r."seasonId" = s."id" AND r."finalizedAt" IS NOT NULL
WHERE s."status" = 'FINISHED' GROUP BY s."id";
