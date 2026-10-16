-- CreateTable
CREATE TABLE "DriverOfTheDayVote" (
    "raceId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("raceId", "voterId"),
    CONSTRAINT "DriverOfTheDayVote_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverOfTheDayVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverOfTheDayVote_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
