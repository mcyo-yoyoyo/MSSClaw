-- 第 6 期：其余 JSON 文档拆成正式表，删除过渡表 center_record。
-- 数据由 npm run migrate:remaining 搬运；这里只在 center_record 为空（全新库）时直接删表，
-- 有数据时留给迁移脚本搬完再删，避免先 migrate deploy 后跑脚本时丢数据。

-- CreateTable
CREATE TABLE "office_scene" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "tool_id" TEXT,
    "tool_blurb" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "office_scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_resource" (
    "kind" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "center_resource_pkey" PRIMARY KEY ("kind","id")
);

-- CreateTable
CREATE TABLE "portal_content" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "published" BOOLEAN,
    "is_gold" BOOLEAN,
    "source_type" TEXT,
    "visibility" TEXT,
    "publisher_name" TEXT,
    "publisher_member_id" TEXT,
    "owner_dept_ids" JSONB,
    "owner_region_id" TEXT,
    "scenario_tags" JSONB,
    "homepage_url" TEXT,
    "kb_doc_id" TEXT,
    "agent_id" TEXT,
    "skill_id" TEXT,
    "primary_skill_id" TEXT,
    "tool_id" TEXT,
    "pain_point" TEXT,
    "impact_metric" TEXT,
    "steps" JSONB,
    "package_version" TEXT,
    "preview_file" JSONB,
    "layout_preview_file" JSONB,
    "published_at" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "portal_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_approval" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "asset_kind" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "submitter_member_id" TEXT,
    "submitter_name" TEXT NOT NULL,
    "step_index" SMALLINT NOT NULL,
    "status" TEXT NOT NULL,
    "reasons" JSONB,
    "note" TEXT,
    "reject_note" TEXT,
    "target_version" TEXT,
    "package_blob" JSONB,
    "unpublish_mode" TEXT,
    "unpublish_versions" JSONB,
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "asset_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_approval_watch" (
    "member_id" TEXT NOT NULL,
    "asset_kind" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_approval_watch_pkey" PRIMARY KEY ("member_id","asset_kind","asset_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "entry_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "dept_ids" JSONB,
    "region_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_announcement" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "badge_color" TEXT,
    "published" BOOLEAN NOT NULL,
    "published_at" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "station_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_news_post" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "source" TEXT,
    "published_at" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_news_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_news_feed_item" (
    "id" TEXT NOT NULL,
    "published_at" TEXT NOT NULL,
    "date_label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "category" TEXT,
    "reason" TEXT,
    "score" INTEGER,
    "aihot_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_news_feed_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "chat_id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "message" TEXT NOT NULL,
    "error" TEXT,
    "total_time_label" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "has_usage" BOOLEAN NOT NULL DEFAULT false,
    "steps" JSONB,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_knowledge_draft" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "owner_member_id" TEXT,
    "scenario_id" TEXT NOT NULL,
    "original_question" TEXT NOT NULL,
    "demand" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "clarification_count" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_knowledge_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_knowledge_solution" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "owner_member_id" TEXT,
    "scenario_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "maturity" TEXT NOT NULL,
    "generation_source" TEXT NOT NULL,
    "model" TEXT,
    "original_question" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_knowledge_solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_model_config" (
    "scope" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "source" TEXT,
    "label" TEXT NOT NULL,
    "provider_name" TEXT,
    "base_url" TEXT NOT NULL,
    "api_key" TEXT,
    "enabled" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "llm_model_config_pkey" PRIMARY KEY ("scope","model_id")
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" TEXT NOT NULL,
    "owner_member_id" TEXT,
    "owner_email" TEXT,
    "type" TEXT NOT NULL,
    "session_group" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "icon" TEXT NOT NULL,
    "icon_bg" TEXT,
    "color" TEXT NOT NULL,
    "badge" TEXT,
    "agent_id" TEXT,
    "skill_id" TEXT,
    "action_type" TEXT,
    "task_source" TEXT,
    "business_scenario_id" TEXT,
    "admin_member_id" TEXT,
    "members" JSONB,
    "prompts" JSONB NOT NULL,
    "history" JSONB NOT NULL,
    "pinned_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_approval_asset_idx" ON "asset_approval"("asset_kind", "asset_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_entry_id_key" ON "audit_log"("entry_id");

-- CreateIndex
CREATE INDEX "audit_log_time_idx" ON "audit_log"("occurred_at");

-- CreateIndex
CREATE INDEX "ai_news_feed_item_published_idx" ON "ai_news_feed_item"("published_at");

-- CreateIndex
CREATE INDEX "execution_updated_idx" ON "execution"("updated_at");

-- CreateIndex
CREATE INDEX "ai_knowledge_draft_owner_idx" ON "ai_knowledge_draft"("owner_key", "updated_at");

-- CreateIndex
CREATE INDEX "ai_knowledge_solution_owner_idx" ON "ai_knowledge_solution"("owner_key", "created_at");

-- CreateIndex
CREATE INDEX "chat_session_owner_idx" ON "chat_session"("owner_member_id", "updated_at");


-- 过渡表为空才删；有数据的由迁移脚本搬完后删除
DO $$
BEGIN
  IF to_regclass('center_record') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM center_record) THEN
    DROP TABLE center_record;
  END IF;
END $$;
