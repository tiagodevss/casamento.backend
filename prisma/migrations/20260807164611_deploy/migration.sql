-- DropForeignKey
ALTER TABLE "RsvpResponse" DROP CONSTRAINT "RsvpResponse_guestGroupId_fkey";

-- AddForeignKey
ALTER TABLE "RsvpResponse" ADD CONSTRAINT "RsvpResponse_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
