-- Existing rows are authenticated page views, so the default preserves their report bucket.
ALTER TABLE "PortalPageView"
ADD COLUMN "visitorType" TEXT NOT NULL DEFAULT 'user';

-- A browser-stable journey hash links guest and authenticated views without storing the raw ID.
-- It is nullable because historical facts predate the browser visitor ID.
ALTER TABLE "PortalPageView"
ADD COLUMN "journeyHash" TEXT;

CREATE INDEX "PortalPageView_workspaceId_dateKey_visitorType_idx"
ON "PortalPageView"("workspaceId", "dateKey", "visitorType");

CREATE INDEX "PortalPageView_workspaceId_dateKey_journeyHash_idx"
ON "PortalPageView"("workspaceId", "dateKey", "journeyHash");
