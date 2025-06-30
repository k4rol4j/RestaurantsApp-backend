-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Restaurant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "imageUrl" TEXT,
    "description" TEXT,
    "imageGallery" TEXT,
    "openingHours" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 50
);
INSERT INTO "new_Restaurant" ("cuisine", "description", "id", "imageGallery", "imageUrl", "latitude", "location", "longitude", "name", "rating") SELECT "cuisine", "description", "id", "imageGallery", "imageUrl", "latitude", "location", "longitude", "name", "rating" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
