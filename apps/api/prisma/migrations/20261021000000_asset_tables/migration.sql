-- CreateTable
CREATE TABLE "tool" (
    "no" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "market_title" TEXT,
    "description" TEXT NOT NULL,
    "card_summary" TEXT,
    "category" TEXT NOT NULL,
    "source_type" TEXT,
    "market_shelf" TEXT,
    "region" TEXT,
    "company" TEXT,
    "author" TEXT NOT NULL,
    "publisher_name" TEXT,
    "publisher_member_id" TEXT,
    "published" BOOLEAN NOT NULL,
    "visibility" TEXT,
    "owner_dept_ids" JSONB,
    "owner_region_id" TEXT,
    "owner_region_ids" JSONB,
    "icon" TEXT NOT NULL,
    "logo_url" TEXT,
    "homepage_url" TEXT,
    "docs_url" TEXT,
    "media_url" TEXT,
    "screenshot_url" TEXT,
    "version_label" TEXT,
    "delivery_form" TEXT,
    "connector_type" TEXT,
    "tool_type_id" TEXT,
    "tool_type_ids" JSONB,
    "tool_type_labels" JSONB,
    "external_category_ranks" JSONB,
    "external_sort_order" INTEGER,
    "external_sort_rank" INTEGER,
    "best_for" TEXT,
    "product_intro" TEXT,
    "core_capabilities" JSONB,
    "usage_guide" JSONB,
    "tags" JSONB NOT NULL,
    "scenario_tags" JSONB,
    "business_scenario_ids" JSONB,
    "invokes" INTEGER NOT NULL DEFAULT 0,
    "featured_in_find_cases" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tool_pkey" PRIMARY KEY ("no")
);

-- CreateTable
CREATE TABLE "skill" (
    "no" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_zh" TEXT,
    "name_en" TEXT,
    "description" TEXT NOT NULL,
    "description_zh" TEXT,
    "description_en" TEXT,
    "category" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher_name" TEXT,
    "publisher_member_id" TEXT,
    "version" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL,
    "callable" BOOLEAN,
    "featured_in_do_task" BOOLEAN,
    "featured_in_mss_market" BOOLEAN,
    "business_scenario_id" TEXT,
    "source_type" TEXT,
    "visibility" TEXT,
    "owner_dept_ids" JSONB,
    "owner_region_id" TEXT,
    "owner_region_ids" JSONB,
    "homepage_url" TEXT,
    "scenario_tags" JSONB,
    "invokes" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL,
    "icon_url" TEXT,
    "accent_color" TEXT,
    "tags" JSONB NOT NULL,
    "search_keywords" JSONB,
    "instructions" TEXT,
    "plan_steps" JSONB,
    "usage_notes" TEXT,
    "package_blob" JSONB,
    "detail" JSONB,
    "trace_evaluation" JSONB,
    "updated_by" TEXT,
    "source_created_at" TEXT,
    "source_updated_at" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("no")
);

-- CreateTable
CREATE TABLE "skill_version" (
    "skill_no" BIGINT NOT NULL,
    "version" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT,
    "package_blob" JSONB,
    "published_at" TEXT,

    CONSTRAINT "skill_version_pkey" PRIMARY KEY ("skill_no","version")
);

-- CreateTable
CREATE TABLE "agent" (
    "no" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value_proposition" TEXT,
    "category" TEXT NOT NULL,
    "biz_line" TEXT NOT NULL,
    "home_tag" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher_name" TEXT,
    "publisher_member_id" TEXT,
    "maintainer" TEXT,
    "published" BOOLEAN NOT NULL,
    "featured_in_do_task" BOOLEAN,
    "lifecycle_status" TEXT,
    "business_scenario_id" TEXT,
    "source_type" TEXT,
    "visibility" TEXT,
    "owner_dept_ids" JSONB,
    "owner_region_ids" JSONB,
    "scenario_tags" JSONB,
    "capability_type_ids" JSONB,
    "invokes" INTEGER NOT NULL DEFAULT 0,
    "primary_skill_id" TEXT,
    "chat_id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "avatar_preset_id" TEXT,
    "avatar_url" TEXT,
    "system_prompt" TEXT,
    "demo_prompt" TEXT,
    "demo_url" TEXT,
    "solution_doc_url" TEXT,
    "feedback_url" TEXT,
    "install_command" TEXT,
    "version" TEXT,
    "version_summary" TEXT,
    "requires_human_review" BOOLEAN,
    "package_blob" JSONB,
    "plan_steps" JSONB,
    "detail" JSONB,
    "source_created_at" TEXT,
    "source_updated_at" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("no")
);

-- CreateTable
CREATE TABLE "agent_skill" (
    "agent_no" BIGINT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "agent_skill_pkey" PRIMARY KEY ("agent_no","skill_id")
);

-- CreateTable
CREATE TABLE "automation" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "skill_ids" JSONB NOT NULL,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "last_run" TEXT NOT NULL,
    "icon" TEXT,
    "published" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_document" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "size_label" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "clearance" TEXT NOT NULL,
    "indexed" BOOLEAN NOT NULL,
    "chunks" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "chunk_texts" JSONB,
    "content" TEXT,
    "published" BOOLEAN,
    "source_updated_at" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "kb_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_id_key" ON "tool"("id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_id_key" ON "skill"("id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_id_key" ON "agent"("id");

-- CreateIndex
CREATE INDEX "agent_skill_skill_idx" ON "agent_skill"("skill_id");

-- AddForeignKey
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skill_no_fkey" FOREIGN KEY ("skill_no") REFERENCES "skill"("no") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_skill" ADD CONSTRAINT "agent_skill_agent_no_fkey" FOREIGN KEY ("agent_no") REFERENCES "agent"("no") ON DELETE CASCADE ON UPDATE CASCADE;

