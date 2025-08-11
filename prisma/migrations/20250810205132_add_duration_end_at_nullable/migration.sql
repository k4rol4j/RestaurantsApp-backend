-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "endAt" TIMESTAMP(3);
