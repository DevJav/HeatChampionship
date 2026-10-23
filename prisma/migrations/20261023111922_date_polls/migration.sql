-- CreateTable
CREATE TABLE "DatePoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstDay" TEXT NOT NULL,
    "lastDay" TEXT NOT NULL,
    "blockedDays" JSONB NOT NULL,
    "note" TEXT,
    "raceId" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DatePoll_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DatePollAnswer" (
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("pollId", "userId", "day"),
    CONSTRAINT "DatePollAnswer_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DatePoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DatePollAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DatePoll_raceId_key" ON "DatePoll"("raceId");

-- CreateIndex
CREATE INDEX "DatePoll_closedAt_idx" ON "DatePoll"("closedAt");
