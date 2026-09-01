-- Preserve the asset kind on execution facts so the dashboard can separate
-- tool, Skill, and Agent calls. Legacy events remain explicitly unknown.
ALTER TABLE "MarketEngagementEvent" ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX "MarketEngagementEvent_workspaceId_assetType_action_dateKey_idx"
ON "MarketEngagementEvent"("workspaceId", "assetType", "action", "dateKey");
