-- QR Code de entrada da festa: um token por convite e o registro da entrada na porta.
ALTER TABLE "GuestGroup" ADD COLUMN IF NOT EXISTS "ticketToken" TEXT;
ALTER TABLE "GuestGroup" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestGroup_ticketToken_key" ON "GuestGroup"("ticketToken");
