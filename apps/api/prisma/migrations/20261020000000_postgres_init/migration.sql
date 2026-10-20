-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "app_setting" (
    "setting_key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "schema_version" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_by_member_id" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("setting_key")
);

-- CreateTable
CREATE TABLE "center_record" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "center_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_engagement_stat" (
    "content_id" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_engagement_stat_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "market_user_interaction" (
    "member_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "vote" TEXT,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_user_interaction_pkey" PRIMARY KEY ("member_id","content_id")
);

-- CreateTable
CREATE TABLE "market_engagement_event" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "content_id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT 'unknown',
    "action" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "visitor_hash" TEXT,
    "visitor_type" TEXT NOT NULL DEFAULT 'user',
    "success" BOOLEAN,
    "duration_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "error_code" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_engagement_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_page_view" (
    "event_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "route_key" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "visitor_type" TEXT NOT NULL DEFAULT 'user',
    "journey_hash" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_page_view_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "portal_daily_login" (
    "date_key" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "first_login_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_daily_login_pkey" PRIMARY KEY ("date_key","visitor_hash")
);

-- CreateTable
CREATE TABLE "portal_conversion_event" (
    "event_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "action" TEXT,
    "route_key" TEXT,
    "journey_hash" TEXT NOT NULL,
    "user_hash" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_conversion_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "ai_brief_email_subscription" (
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_brief_email_subscription_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "case_insight_article" (
    "id" TEXT NOT NULL,
    "source_case_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "source_url" TEXT NOT NULL DEFAULT '',
    "domain_ids" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "draft_html" TEXT NOT NULL DEFAULT '',
    "draft_markdown" TEXT NOT NULL,
    "draft_cover_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_title" TEXT,
    "published_summary" TEXT,
    "published_company" TEXT,
    "published_source_url" TEXT,
    "published_domain_ids" JSONB,
    "published_tags" JSONB,
    "published_html" TEXT,
    "published_markdown" TEXT,
    "published_cover_image" TEXT,
    "published_version" INTEGER,
    "published_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_from_status" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_insight_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_message" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "from_member_id" TEXT,
    "from_name" TEXT NOT NULL,
    "to_member_id" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_message_state" (
    "member_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inbox_message_state_pkey" PRIMARY KEY ("member_id","message_id")
);

-- CreateIndex
CREATE INDEX "center_record_kind_idx" ON "center_record"("kind");

-- CreateIndex
CREATE INDEX "market_user_interaction_favorited_idx" ON "market_user_interaction"("member_id", "favorited");

-- CreateIndex
CREATE UNIQUE INDEX "market_engagement_event_event_id_key" ON "market_engagement_event"("event_id");

-- CreateIndex
CREATE INDEX "market_engagement_event_date_action_idx" ON "market_engagement_event"("date_key", "action");

-- CreateIndex
CREATE INDEX "market_engagement_event_time_idx" ON "market_engagement_event"("occurred_at");

-- CreateIndex
CREATE INDEX "market_engagement_event_date_visitor_idx" ON "market_engagement_event"("date_key", "visitor_hash");

-- CreateIndex
CREATE INDEX "market_engagement_event_visitor_time_idx" ON "market_engagement_event"("visitor_hash", "occurred_at");

-- CreateIndex
CREATE INDEX "portal_page_view_route_idx" ON "portal_page_view"("date_key", "route_key");

-- CreateIndex
CREATE INDEX "portal_page_view_visitor_idx" ON "portal_page_view"("date_key", "visitor_hash");

-- CreateIndex
CREATE INDEX "portal_conversion_event_type_idx" ON "portal_conversion_event"("date_key", "event_type");

-- CreateIndex
CREATE INDEX "portal_conversion_event_journey_idx" ON "portal_conversion_event"("journey_hash", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "ai_brief_email_subscription_time_idx" ON "ai_brief_email_subscription"("subscribed_at");

-- CreateIndex
CREATE INDEX "ai_brief_email_subscription_email_idx" ON "ai_brief_email_subscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "case_insight_article_source_case_id_key" ON "case_insight_article"("source_case_id");

-- CreateIndex
CREATE INDEX "case_insight_article_list_idx" ON "case_insight_article"("status", "sort_order");

-- CreateIndex
CREATE INDEX "case_insight_article_updated_idx" ON "case_insight_article"("updated_at");

-- CreateIndex
CREATE INDEX "inbox_message_to_idx" ON "inbox_message"("to_member_id", "created_at");

-- CreateIndex
CREATE INDEX "inbox_message_state_message_idx" ON "inbox_message_state"("message_id");

-- AddForeignKey
ALTER TABLE "inbox_message_state" ADD CONSTRAINT "inbox_message_state_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "inbox_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

