-- CreateTable
CREATE TABLE "Prediction" (
    "raceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstId" TEXT NOT NULL,
    "secondId" TEXT NOT NULL,
    "thirdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("raceId", "userId"),
    CONSTRAINT "Prediction_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_firstId_fkey" FOREIGN KEY ("firstId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_secondId_fkey" FOREIGN KEY ("secondId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_thirdId_fkey" FOREIGN KEY ("thirdId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
