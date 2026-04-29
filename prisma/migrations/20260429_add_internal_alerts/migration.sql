-- CreateEnum
CREATE TYPE "AlertType" AS ENUM (
  'NEW_HIGH_SCORE_OPPORTUNITY',
  'PRICE_DROPPED',
  'DECISION_UPGRADED_TO_BUY_NOW',
  'DECISION_UPGRADED_TO_MAKE_OFFER',
  'NEW_LISTING_MATCHED_PROFILE'
);

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM (
  'INFO',
  'WARNING',
  'CRITICAL'
);

-- CreateTable
CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "listingRawId" TEXT NOT NULL,
  "searchProfileId" TEXT NOT NULL,
  "listingEvaluationId" TEXT,
  "alertType" "AlertType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),

  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_dedupeKey_key" ON "Alert"("dedupeKey");

-- CreateIndex
CREATE INDEX "Alert_searchProfileId_createdAt_idx" ON "Alert"("searchProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_listingRawId_createdAt_idx" ON "Alert"("listingRawId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_listingEvaluationId_idx" ON "Alert"("listingEvaluationId");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- AddForeignKey
ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_listingRawId_fkey"
FOREIGN KEY ("listingRawId") REFERENCES "ListingRaw"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_searchProfileId_fkey"
FOREIGN KEY ("searchProfileId") REFERENCES "SearchProfile"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_listingEvaluationId_fkey"
FOREIGN KEY ("listingEvaluationId") REFERENCES "ListingEvaluation"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
