-- CreateTable
CREATE TABLE "market_user_vote" (
    "member_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "vote" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_user_vote_pkey" PRIMARY KEY ("member_id","content_id")
);

-- CreateTable
CREATE TABLE "market_favorite" (
    "member_id" TEXT NOT NULL,
    "shelf_kind" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT '',
    "asset_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "logo_url" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_favorite_pkey" PRIMARY KEY ("member_id","shelf_kind","asset_type","asset_id")
);

-- CreateTable
CREATE TABLE "market_recent_view" (
    "member_id" TEXT NOT NULL,
    "shelf_kind" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT '',
    "asset_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "logo_url" TEXT,
    "viewed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_recent_view_pkey" PRIMARY KEY ("member_id","shelf_kind","asset_type","asset_id")
);

-- CreateTable
CREATE TABLE "market_hidden_item" (
    "member_id" TEXT NOT NULL,
    "shelf_kind" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "hidden_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_hidden_item_pkey" PRIMARY KEY ("member_id","shelf_kind","asset_id")
);

-- CreateTable
CREATE TABLE "skill_review" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "reply" TEXT,
    "replied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_favorite_content_idx" ON "market_favorite"("content_id");

-- CreateIndex
CREATE INDEX "market_favorite_member_content_idx" ON "market_favorite"("member_id", "content_id");

-- CreateIndex
CREATE INDEX "skill_review_skill_idx" ON "skill_review"("skill_id", "created_at");

-- 点赞 / 点踩迁到 market_user_vote；收藏状态改由 market_favorite 表达（收藏清单由 migrate:personal-data 从旧文档迁入）
INSERT INTO "market_user_vote" ("member_id", "content_id", "vote", "updated_at")
SELECT "member_id", "content_id", "vote", "updated_at" FROM "market_user_interaction" WHERE "vote" IS NOT NULL;

-- DropTable
DROP TABLE "market_user_interaction";
