/*
  Warnings:

  - You are about to drop the column `avgPaceSecPerKm` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `distanceMeters` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `elevationGain` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyMileageGoal` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `WeightLog` table. All the data in the column will be lost.
  - Added the required column `distanceMiles` to the `Run` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weightLbs` to the `WeightLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CoachingLog" ADD COLUMN "focusArea" TEXT;
ALTER TABLE "CoachingLog" ADD COLUMN "recoveryScore" INTEGER;

-- CreateTable
CREATE TABLE "Bike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "corosActivityId" TEXT,
    "date" DATETIME NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'bike',
    "distanceMiles" REAL NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "avgSpeedMph" REAL,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "elevationFt" REAL,
    "calories" INTEGER,
    "avgPower" INTEGER,
    "cadenceRpm" INTEGER,
    "trainingLoad" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrengthLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "durationMin" INTEGER,
    "notes" TEXT,
    "exercises" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrengthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "corosActivityId" TEXT,
    "date" DATETIME NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'run',
    "distanceMiles" REAL NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "avgPaceSecMile" REAL,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "elevationFt" REAL,
    "calories" INTEGER,
    "trainingLoad" REAL,
    "vo2max" REAL,
    "aerobicEffect" REAL,
    "anaerobicEffect" REAL,
    "cadence" INTEGER,
    "hrv" INTEGER,
    "recoveryTime" INTEGER,
    "splits" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("avgHeartRate", "calories", "corosActivityId", "createdAt", "date", "durationSeconds", "id", "maxHeartRate", "name", "splits", "trainingLoad", "type", "userId", "vo2max") SELECT "avgHeartRate", "calories", "corosActivityId", "createdAt", "date", "durationSeconds", "id", "maxHeartRate", "name", "splits", "trainingLoad", "type", "userId", "vo2max" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE UNIQUE INDEX "Run_corosActivityId_key" ON "Run"("corosActivityId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weeklyRunMilesGoal" REAL,
    "weeklyBikeMilesGoal" REAL,
    "strengthDaysGoal" INTEGER,
    "coreDaysGoal" INTEGER,
    "dailyCalorieGoal" INTEGER,
    "dailyProteinGoal" INTEGER,
    "dailyCarbsGoal" INTEGER,
    "dailyFatGoal" INTEGER,
    "weightGoal" REAL,
    "currentWeight" REAL,
    "corosAccessToken" TEXT,
    "corosRefreshToken" TEXT,
    "corosTokenExpiry" DATETIME,
    "corosUserId" TEXT
);
INSERT INTO "new_User" ("corosAccessToken", "corosRefreshToken", "corosTokenExpiry", "corosUserId", "createdAt", "currentWeight", "dailyCalorieGoal", "dailyProteinGoal", "email", "id", "name", "updatedAt", "weightGoal") SELECT "corosAccessToken", "corosRefreshToken", "corosTokenExpiry", "corosUserId", "createdAt", "currentWeight", "dailyCalorieGoal", "dailyProteinGoal", "email", "id", "name", "updatedAt", "weightGoal" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_WeightLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weightLbs" REAL NOT NULL,
    "bodyFatPct" REAL,
    "hrvScore" INTEGER,
    "sleepHrs" REAL,
    "restingHr" INTEGER,
    "recoveryScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WeightLog" ("createdAt", "date", "id", "userId") SELECT "createdAt", "date", "id", "userId" FROM "WeightLog";
DROP TABLE "WeightLog";
ALTER TABLE "new_WeightLog" RENAME TO "WeightLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Bike_corosActivityId_key" ON "Bike"("corosActivityId");
