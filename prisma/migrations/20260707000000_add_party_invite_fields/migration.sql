ALTER TABLE "GuestGroup"
ADD COLUMN "invitedToParty" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RsvpResponse"
ADD COLUMN "partyAttending" BOOLEAN;
