-- AlterTable
ALTER TABLE "GuestGroup"
ADD COLUMN "phoneNormalized" TEXT,
ADD COLUMN "whatsappOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappOptOutAt" TIMESTAMP(3);

-- Normalize existing phones so the WhatsApp integration can resolve conversations immediately.
UPDATE "GuestGroup"
SET "phoneNormalized" = CASE
  WHEN length(regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g')) IN (10, 11)
    THEN '55' || regexp_replace("phone", '[^0-9]', '', 'g')
  WHEN length(regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g')) IN (12, 13)
    AND regexp_replace("phone", '[^0-9]', '', 'g') LIKE '55%'
    THEN regexp_replace("phone", '[^0-9]', '', 'g')
  ELSE NULL
END
WHERE "phone" IS NOT NULL;

CREATE TYPE "CommunicationCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "CommunicationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');
CREATE TYPE "CommunicationAudience" AS ENUM ('ALL', 'RSVP_PENDING', 'CONFIRMED', 'CEREMONY_ONLY_CONFIRMED', 'PARTY_CONFIRMED', 'CUSTOM');
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bodySingle" TEXT NOT NULL,
    "bodyGroup" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "audience" "CommunicationAudience" NOT NULL DEFAULT 'ALL',
    "includeGuestGroupIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requireInviteSent" BOOLEAN NOT NULL DEFAULT true,
    "status" "CommunicationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "previewedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "guestGroupId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "renderedMessage" TEXT NOT NULL,
    "status" "CommunicationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "skippedReason" TEXT,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "guestGroupId" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "eventType" TEXT,
    "needsHuman" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationTemplate_key_key" ON "CommunicationTemplate"("key");
CREATE INDEX "CommunicationCampaign_status_scheduledAt_idx" ON "CommunicationCampaign"("status", "scheduledAt");
CREATE INDEX "CommunicationCampaign_templateId_idx" ON "CommunicationCampaign"("templateId");
CREATE UNIQUE INDEX "CommunicationDelivery_campaignId_guestGroupId_key" ON "CommunicationDelivery"("campaignId", "guestGroupId");
CREATE INDEX "CommunicationDelivery_status_nextAttemptAt_idx" ON "CommunicationDelivery"("status", "nextAttemptAt");
CREATE INDEX "CommunicationDelivery_providerMessageId_idx" ON "CommunicationDelivery"("providerMessageId");
CREATE INDEX "CommunicationDelivery_guestGroupId_idx" ON "CommunicationDelivery"("guestGroupId");
CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key" ON "WhatsAppMessage"("providerMessageId");
CREATE INDEX "WhatsAppMessage_guestGroupId_createdAt_idx" ON "WhatsAppMessage"("guestGroupId", "createdAt");
CREATE INDEX "WhatsAppMessage_needsHuman_resolvedAt_idx" ON "WhatsAppMessage"("needsHuman", "resolvedAt");
CREATE INDEX "WhatsAppMessage_phone_createdAt_idx" ON "WhatsAppMessage"("phone", "createdAt");
CREATE INDEX "GuestGroup_phoneNormalized_idx" ON "GuestGroup"("phoneNormalized");
CREATE INDEX "GuestGroup_whatsappOptOut_idx" ON "GuestGroup"("whatsappOptOut");

ALTER TABLE "CommunicationCampaign" ADD CONSTRAINT "CommunicationCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationDelivery" ADD CONSTRAINT "CommunicationDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationDelivery" ADD CONSTRAINT "CommunicationDelivery_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
