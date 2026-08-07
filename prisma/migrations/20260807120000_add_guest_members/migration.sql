-- CreateTable
CREATE TABLE "GuestMember" (
    "id" TEXT NOT NULL,
    "guestGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attending" BOOLEAN,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestMember_guestGroupId_idx" ON "GuestMember"("guestGroupId");

-- AddForeignKey
ALTER TABLE "GuestMember" ADD CONSTRAINT "GuestMember_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: attendance moves to GuestMember
ALTER TABLE "RsvpResponse" DROP COLUMN "attending";
