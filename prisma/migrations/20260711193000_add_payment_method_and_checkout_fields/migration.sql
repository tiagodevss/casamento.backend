CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD');

ALTER TABLE "PaymentOrder"
ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'PIX',
ADD COLUMN "abacateBillingId" TEXT,
ADD COLUMN "checkoutUrl" TEXT;
