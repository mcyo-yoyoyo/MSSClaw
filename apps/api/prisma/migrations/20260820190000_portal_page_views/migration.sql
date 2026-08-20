-- Portal page-view facts. The composite primary key makes client retries idempotent.
CREATE TABLE "PortalPageView" (
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("workspaceId", "eventId")
);

CREATE INDEX "PortalPageView_workspaceId_dateKey_idx"
ON "PortalPageView"("workspaceId", "dateKey");

CREATE INDEX "PortalPageView_workspaceId_dateKey_routeKey_idx"
ON "PortalPageView"("workspaceId", "dateKey", "routeKey");

CREATE INDEX "PortalPageView_workspaceId_dateKey_visitorHash_idx"
ON "PortalPageView"("workspaceId", "dateKey", "visitorHash");
