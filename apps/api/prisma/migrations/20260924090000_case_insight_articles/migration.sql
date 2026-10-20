CREATE TABLE "CaseInsightArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "domainIds" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "draftMarkdown" TEXT NOT NULL,
    "publishedMarkdown" TEXT,
    "publishedTitle" TEXT,
    "publishedSummary" TEXT,
    "publishedCompany" TEXT,
    "publishedSourceUrl" TEXT,
    "publishedDomainIds" JSONB,
    "publishedTags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME
);
CREATE INDEX "CaseInsightArticle_workspaceId_status_sortOrder_idx" ON "CaseInsightArticle"("workspaceId", "status", "sortOrder");
CREATE INDEX "CaseInsightArticle_workspaceId_updatedAt_idx" ON "CaseInsightArticle"("workspaceId", "updatedAt");
