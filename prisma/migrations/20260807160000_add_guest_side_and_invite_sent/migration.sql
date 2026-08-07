-- CreateEnum
CREATE TYPE "GuestSide" AS ENUM ('GROOM', 'BRIDE', 'BOTH');

-- AlterTable
ALTER TABLE "GuestGroup" ADD COLUMN "side" "GuestSide" NOT NULL DEFAULT 'BOTH';
ALTER TABLE "GuestGroup" ADD COLUMN "inviteSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "GuestGroup_side_idx" ON "GuestGroup"("side");
CREATE INDEX "GuestGroup_inviteSent_idx" ON "GuestGroup"("inviteSent");
