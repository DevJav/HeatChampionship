-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "expansion" TEXT,
    "defaultLaps" INTEGER,
    "imageUrl" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);
-- Free-text country → ISO code for the base-game countries; anything else is left for the admin to pick
INSERT INTO "new_Track" ("active", "countryCode", "defaultLaps", "description", "expansion", "id", "imageUrl", "name", "slug")
SELECT "active",
    CASE lower(trim("country"))
        WHEN 'ee. uu.' THEN 'US' WHEN 'eeuu' THEN 'US' WHEN 'estados unidos' THEN 'US' WHEN 'usa' THEN 'US'
        WHEN 'italia' THEN 'IT'
        WHEN 'francia' THEN 'FR'
        WHEN 'reino unido' THEN 'GB' WHEN 'gran bretaña' THEN 'GB' WHEN 'inglaterra' THEN 'GB'
        WHEN 'españa' THEN 'ES'
        WHEN 'japón' THEN 'JP'
        WHEN 'méxico' THEN 'MX'
        WHEN 'alemania' THEN 'DE'
        WHEN 'bélgica' THEN 'BE'
        WHEN 'países bajos' THEN 'NL' WHEN 'holanda' THEN 'NL'
        ELSE NULL
    END,
    "defaultLaps", "description", "expansion", "id", "imageUrl", "name", "slug" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

