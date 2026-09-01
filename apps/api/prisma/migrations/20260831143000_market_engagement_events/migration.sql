-- CreateTable
CREATE TABLE "MarketEngagementEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "MarketEngagementEvent_workspaceId_dateKey_action_idx"
ON "MarketEngagementEvent"("workspaceId", "dateKey", "action");

-- CreateIndex
CREATE INDEX "MarketEngagementEvent_workspaceId_contentId_occurredAt_idx"
ON "MarketEngagementEvent"("workspaceId", "contentId", "occurredAt");
