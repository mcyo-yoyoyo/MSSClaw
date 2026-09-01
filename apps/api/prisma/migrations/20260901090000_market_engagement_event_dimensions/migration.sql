-- Add identity and optional execution dimensions to the existing engagement facts.
-- Historical rows are retained as user-typed facts for backwards-compatible reads;
-- current writes always provide the actual visitor type and account/guest hash.
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "visitorType" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "success" BOOLEAN;
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "errorCode" TEXT;

CREATE INDEX "MarketEngagementEvent_workspaceId_contentId_action_dateKey_idx"
ON "MarketEngagementEvent"("workspaceId", "contentId", "action", "dateKey");
