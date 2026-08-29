-- Anonymous gate hits and successful logins share a browser-stable journey hash.
-- Raw visitor and account identifiers are never stored in this analytics fact table.
CREATE TABLE "PortalConversionEvent" (
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "routeKey" TEXT,
    "journeyHash" TEXT NOT NULL,
    "userHash" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("workspaceId", "eventId")
);

CREATE INDEX "PortalConversionEvent_workspaceId_dateKey_eventType_idx"
ON "PortalConversionEvent"("workspaceId", "dateKey", "eventType");

CREATE INDEX "PortalConversionEvent_workspaceId_dateKey_journeyHash_idx"
ON "PortalConversionEvent"("workspaceId", "dateKey", "journeyHash");

CREATE INDEX "PortalConversionEvent_workspaceId_dateKey_action_idx"
ON "PortalConversionEvent"("workspaceId", "dateKey", "action");

CREATE INDEX "PortalConversionEvent_workspaceId_journeyHash_eventType_occurredAt_idx"
ON "PortalConversionEvent"("workspaceId", "journeyHash", "eventType", "occurredAt");
