-- 身份改造第 4 步：Skill / Agent 的区域、领域标签从 JSON 列搬进关联表，用于按成员归属过滤。工具保持 JSON 列。

CREATE TABLE "skill_region" (
    "skill_no" BIGINT NOT NULL,
    "region_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "skill_region_pkey" PRIMARY KEY ("skill_no","region_id")
);
CREATE TABLE "skill_domain" (
    "skill_no" BIGINT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "skill_domain_pkey" PRIMARY KEY ("skill_no","domain_id")
);
CREATE TABLE "agent_region" (
    "agent_no" BIGINT NOT NULL,
    "region_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "agent_region_pkey" PRIMARY KEY ("agent_no","region_id")
);
CREATE TABLE "agent_domain" (
    "agent_no" BIGINT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "agent_domain_pkey" PRIMARY KEY ("agent_no","domain_id")
);
CREATE INDEX "skill_region_region_idx" ON "skill_region"("region_id");
CREATE INDEX "skill_domain_domain_idx" ON "skill_domain"("domain_id");
CREATE INDEX "agent_region_region_idx" ON "agent_region"("region_id");
CREATE INDEX "agent_domain_domain_idx" ON "agent_domain"("domain_id");

-- 原标签展开成 (行号, 标签, 顺序)。Skill 的区域：数组非空用数组，否则用单值 owner_region_id（与前端 assetRegionIds 一致）
CREATE TEMP TABLE "tmp_asset_tag" ("kind" TEXT, "no" BIGINT, "axis" TEXT, "tag" TEXT, "ord" INTEGER);

INSERT INTO "tmp_asset_tag"
SELECT 'skill', s."no", 'region', btrim(t.v), t.ord::int
FROM "skill" s, jsonb_array_elements_text(CASE WHEN jsonb_typeof(s."owner_region_ids") = 'array' THEN s."owner_region_ids" ELSE '[]'::jsonb END) WITH ORDINALITY AS t(v, ord)
WHERE btrim(t.v) <> '';
INSERT INTO "tmp_asset_tag"
SELECT 'skill', s."no", 'region', btrim(s."owner_region_id"), 1
FROM "skill" s
WHERE NULLIF(btrim(s."owner_region_id"), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "tmp_asset_tag" t WHERE t."kind" = 'skill' AND t."no" = s."no" AND t."axis" = 'region');
INSERT INTO "tmp_asset_tag"
SELECT 'skill', s."no", 'domain', btrim(t.v), t.ord::int
FROM "skill" s, jsonb_array_elements_text(CASE WHEN jsonb_typeof(s."owner_dept_ids") = 'array' THEN s."owner_dept_ids" ELSE '[]'::jsonb END) WITH ORDINALITY AS t(v, ord)
WHERE btrim(t.v) <> '';
INSERT INTO "tmp_asset_tag"
SELECT 'agent', a."no", 'region', btrim(t.v), t.ord::int
FROM "agent" a, jsonb_array_elements_text(CASE WHEN jsonb_typeof(a."owner_region_ids") = 'array' THEN a."owner_region_ids" ELSE '[]'::jsonb END) WITH ORDINALITY AS t(v, ord)
WHERE btrim(t.v) <> '';
INSERT INTO "tmp_asset_tag"
SELECT 'agent', a."no", 'domain', btrim(t.v), t.ord::int
FROM "agent" a, jsonb_array_elements_text(CASE WHEN jsonb_typeof(a."owner_dept_ids") = 'array' THEN a."owner_dept_ids" ELSE '[]'::jsonb END) WITH ORDINALITY AS t(v, ord)
WHERE btrim(t.v) <> '';

-- 字典里没有的标签补进字典（名称先用 id），不丢归属
INSERT INTO "region" ("id", "name", "sort", "updated_at")
SELECT DISTINCT "tag", "tag", 1000, now() FROM "tmp_asset_tag" WHERE "axis" = 'region'
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "domain" ("id", "name", "sort", "updated_at")
SELECT DISTINCT "tag", "tag", 1000, now() FROM "tmp_asset_tag" WHERE "axis" = 'domain'
ON CONFLICT ("id") DO NOTHING;

-- 同一标签重复出现只保留第一次的位置
INSERT INTO "skill_region" ("skill_no", "region_id", "position")
SELECT "no", "tag", min("ord") - 1 FROM "tmp_asset_tag" WHERE "kind" = 'skill' AND "axis" = 'region' GROUP BY "no", "tag";
INSERT INTO "skill_domain" ("skill_no", "domain_id", "position")
SELECT "no", "tag", min("ord") - 1 FROM "tmp_asset_tag" WHERE "kind" = 'skill' AND "axis" = 'domain' GROUP BY "no", "tag";
INSERT INTO "agent_region" ("agent_no", "region_id", "position")
SELECT "no", "tag", min("ord") - 1 FROM "tmp_asset_tag" WHERE "kind" = 'agent' AND "axis" = 'region' GROUP BY "no", "tag";
INSERT INTO "agent_domain" ("agent_no", "domain_id", "position")
SELECT "no", "tag", min("ord") - 1 FROM "tmp_asset_tag" WHERE "kind" = 'agent' AND "axis" = 'domain' GROUP BY "no", "tag";

ALTER TABLE "skill_region" ADD CONSTRAINT "skill_region_skill_no_fkey" FOREIGN KEY ("skill_no") REFERENCES "skill"("no") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_region" ADD CONSTRAINT "skill_region_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_domain" ADD CONSTRAINT "skill_domain_skill_no_fkey" FOREIGN KEY ("skill_no") REFERENCES "skill"("no") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_domain" ADD CONSTRAINT "skill_domain_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_region" ADD CONSTRAINT "agent_region_agent_no_fkey" FOREIGN KEY ("agent_no") REFERENCES "agent"("no") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_region" ADD CONSTRAINT "agent_region_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_domain" ADD CONSTRAINT "agent_domain_agent_no_fkey" FOREIGN KEY ("agent_no") REFERENCES "agent"("no") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_domain" ADD CONSTRAINT "agent_domain_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "tmp_asset_tag";

ALTER TABLE "skill" DROP COLUMN "owner_dept_ids", DROP COLUMN "owner_region_id", DROP COLUMN "owner_region_ids";
ALTER TABLE "agent" DROP COLUMN "owner_dept_ids", DROP COLUMN "owner_region_ids";
