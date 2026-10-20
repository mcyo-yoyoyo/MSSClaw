ALTER TABLE "CaseInsightArticle" ADD COLUMN "sourceCaseId" TEXT;
CREATE UNIQUE INDEX "CaseInsightArticle_workspaceId_sourceCaseId_key" ON "CaseInsightArticle"("workspaceId", "sourceCaseId");
