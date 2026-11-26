-- The "add your email?" banner becomes "add an email to recover your password":
-- a new dismissal date, so drivers who dismissed the old banner see the new one once.
ALTER TABLE "user" ADD COLUMN "recoveryPromptDismissedAt" DATETIME;
ALTER TABLE "user" DROP COLUMN "emailPromptDismissedAt";
