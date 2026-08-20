-- AI Brief email subscribers. One active subscription per workspace user.
CREATE TABLE "AiBriefEmailSubscription" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "userId")
);

CREATE INDEX "AiBriefEmailSubscription_workspaceId_subscribedAt_idx"
ON "AiBriefEmailSubscription"("workspaceId", "subscribedAt");

CREATE INDEX "AiBriefEmailSubscription_workspaceId_email_idx"
ON "AiBriefEmailSubscription"("workspaceId", "email");
