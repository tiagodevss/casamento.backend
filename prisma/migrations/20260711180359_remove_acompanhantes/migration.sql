-- AlterTable
ALTER TABLE "GuestGroup" DROP COLUMN "maxCompanions";

-- AlterTable
ALTER TABLE "RsvpResponse" DROP COLUMN "companionsCount",
DROP COLUMN "companionNames";
