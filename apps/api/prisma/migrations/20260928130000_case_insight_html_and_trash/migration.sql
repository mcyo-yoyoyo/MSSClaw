ALTER TABLE "CaseInsightArticle" ADD COLUMN "draftHtml" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CaseInsightArticle" ADD COLUMN "publishedHtml" TEXT;
ALTER TABLE "CaseInsightArticle" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "CaseInsightArticle" ADD COLUMN "deletedFromStatus" TEXT;
