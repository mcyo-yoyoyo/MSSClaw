-- Existing fact rows predate request-level idempotency, so the new columns stay nullable.
-- All writes from the current API provide both eventId and (for guests) visitorHash.
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "eventId" TEXT;
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "visitorHash" TEXT;

-- Historical rows already have globally unique ids; use them as their immutable request key.
UPDATE "MarketEngagementEvent" SET "eventId" = "id" WHERE "eventId" IS NULL;

CREATE UNIQUE INDEX "MarketEngagementEvent_workspaceId_eventId_key"
ON "MarketEngagementEvent"("workspaceId", "eventId");

CREATE INDEX "MarketEngagementEvent_workspaceId_dateKey_visitorHash_idx"
ON "MarketEngagementEvent"("workspaceId", "dateKey", "visitorHash");

CREATE INDEX "MarketEngagementEvent_workspaceId_visitorHash_occurredAt_idx"
ON "MarketEngagementEvent"("workspaceId", "visitorHash", "occurredAt");

CREATE INDEX "MarketEngagementEvent_workspaceId_occurredAt_idx"
ON "MarketEngagementEvent"("workspaceId", "occurredAt");
