-- Backend-authoritative marketplace engagement counters.
CREATE TABLE "MarketEngagement" (
    "workspaceId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "contentId")
);

CREATE INDEX "MarketEngagement_workspaceId_updatedAt_idx"
ON "MarketEngagement"("workspaceId", "updatedAt");

-- Per-user state makes vote/favorite mutations idempotent.
CREATE TABLE "MarketUserInteraction" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "vote" TEXT,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "userId", "contentId")
);

CREATE INDEX "MarketUserInteraction_workspaceId_userId_favorited_idx"
ON "MarketUserInteraction"("workspaceId", "userId", "favorited");
