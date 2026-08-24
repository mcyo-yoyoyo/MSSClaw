-- One row per workspace, Beijing calendar date and authenticated account.
-- The primary key makes repeated successful logins on the same day idempotent.
CREATE TABLE "PortalDailyLogin" (
    "workspaceId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "firstLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("workspaceId", "dateKey", "visitorHash")
);

CREATE INDEX "PortalDailyLogin_workspaceId_dateKey_idx"
ON "PortalDailyLogin"("workspaceId", "dateKey");
