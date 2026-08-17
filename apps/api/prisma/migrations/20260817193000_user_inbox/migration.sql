CREATE TABLE "InboxMessageRecord" (
    "workspaceId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromUserId" TEXT,
    "fromName" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "meta" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("workspaceId", "id")
);

CREATE INDEX "InboxMessageRecord_workspaceId_toUserId_createdAt_idx"
ON "InboxMessageRecord"("workspaceId", "toUserId", "createdAt");

CREATE TABLE "InboxUserMessageState" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "readAt" DATETIME,
    "deletedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "userId", "messageId")
);

CREATE INDEX "InboxUserMessageState_workspaceId_userId_deletedAt_idx"
ON "InboxUserMessageState"("workspaceId", "userId", "deletedAt");
