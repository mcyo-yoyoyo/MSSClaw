-- 身份改造第 1 步：角色 / 菜单 / 区域 / 领域字典，成员表改为角色外键 + 领域关联表。

-- 迁移前检查：没有邮箱、邮箱转小写后重复、超管多于一个时停下，由运营先处理成员数据。
DO $$
DECLARE
  missing TEXT;
  duplicated TEXT;
  admins TEXT;
BEGIN
  SELECT string_agg("id", ', ') INTO missing FROM "member" WHERE "email" IS NULL OR btrim("email") = '';
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '成员缺少邮箱，无法按邮箱去重：%', missing;
  END IF;

  SELECT string_agg(e || ' (' || ids || ')', '; ') INTO duplicated FROM (
    SELECT lower(btrim("email")) AS e, string_agg("id", ',') AS ids
    FROM "member" GROUP BY lower(btrim("email")) HAVING count(*) > 1
  ) d;
  IF duplicated IS NOT NULL THEN
    RAISE EXCEPTION '成员邮箱转小写后重复：%', duplicated;
  END IF;

  SELECT string_agg("id", ', ') INTO admins FROM "member" WHERE "role" IN ('super_admin', 'workspace_admin');
  IF admins LIKE '%,%' THEN
    RAISE EXCEPTION '超级管理员只能有一个，当前有：%', admins;
  END IF;
END $$;

-- 字典表
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "icon" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_menu" (
    "role_id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    CONSTRAINT "role_menu_pkey" PRIMARY KEY ("role_id","menu_id")
);
CREATE INDEX "role_menu_menu_idx" ON "role_menu"("menu_id");
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "domain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_domain" (
    "member_id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "member_domain_pkey" PRIMARY KEY ("member_id","domain_id")
);
CREATE INDEX "member_domain_domain_idx" ON "member_domain"("domain_id");

-- 内置角色与菜单（菜单 id = 前端 AppView）
INSERT INTO "role" ("id", "name", "description", "is_system", "updated_at") VALUES
  ('super_admin', '超级管理员', '全部菜单与平台治理，全库唯一', true, now()),
  ('capability_ops', '能力开发', '配置 Agent / Skill / 工具', true, now()),
  ('business_user', '业务用户', '工作平台与市场浏览', true, now()),
  ('viewer', '只读访客', '以找案例为主的只读浏览', true, now());

INSERT INTO "menu" ("id", "name", "section", "icon", "sort") VALUES
  ('home', '首页', 'workspace', 'fa-house', 10),
  ('ai-knowledge', 'AI智库', 'workspace', 'fa-book-open-reader', 20),
  ('me', '个人中心', 'workspace', 'fa-user', 30),
  ('ai-tasks', 'AI任务', 'workspace', 'fa-robot', 40),
  ('market-external', '外部工具精选', 'workspace', 'fa-globe', 50),
  ('market-internal', '内部办公推荐', 'workspace', 'fa-building', 60),
  ('market-projects', 'AI工具Hub', 'workspace', 'fa-layer-group', 70),
  ('ai-brief', 'AI快讯', 'workspace', 'fa-newspaper', 80),
  ('market-tool', '资产详情', 'workspace', 'fa-circle-info', 90),
  ('task', '任务记录', 'workspace', 'fa-list-check', 100),
  ('messages', '我的消息', 'workspace', 'fa-bell', 110),
  ('ai-map', '场景案例', 'platform', 'fa-map', 200),
  ('approvals', '审批中心', 'platform', 'fa-clipboard-check', 210),
  ('skills', '配置Skill', 'platform', 'fa-cube', 220),
  ('agents', '配置Agent', 'platform', 'fa-robot', 230),
  ('agent-studio', 'Agent Studio', 'platform', 'fa-wand-magic-sparkles', 240),
  ('tools', '配置工具', 'platform', 'fa-plug', 250),
  ('office-scenes', '配置办公场景', 'platform', 'fa-diagram-project', 260),
  ('kb', '管理知识', 'platform', 'fa-book-open', 270),
  ('memory', '管理记忆', 'platform', 'fa-brain', 280),
  ('automation', '自动化设置', 'platform', 'fa-bolt', 290),
  ('workflow', '工作流设置', 'platform', 'fa-diagram-project', 300),
  ('prompts', '提示词', 'platform', 'fa-file-code', 310),
  ('cases', '案例库', 'platform', 'fa-lightbulb', 320),
  ('portal-ops', '门户运营', 'ops', 'fa-newspaper', 400),
  ('portal-dashboard', '数据看板', 'ops', 'fa-chart-line', 410),
  ('model-ops', '模型配置', 'system', 'fa-microchip', 500),
  ('executions', '执行历史', 'system', 'fa-clock-rotate-left', 510),
  ('admin', '组织权限', 'system', 'fa-shield-halved', 520),
  ('presentation', '展示配置', 'system', 'fa-sliders', 530);

-- 由原前端权限矩阵（rbac.ts + navRbac.ts）换算；super_admin 不查本表
INSERT INTO "role_menu" ("role_id", "menu_id")
SELECT r, m FROM unnest(ARRAY['capability_ops', 'business_user', 'viewer']) AS r,
  unnest(ARRAY['home', 'ai-knowledge', 'me', 'ai-tasks', 'market-external', 'market-internal', 'market-projects',
               'ai-brief', 'market-tool', 'task', 'messages', 'ai-map', 'cases', 'agents', 'agent-studio', 'executions',
               'skills', 'kb', 'prompts', 'automation', 'workflow', 'office-scenes']) AS m;
INSERT INTO "role_menu" ("role_id", "menu_id")
SELECT r, m FROM unnest(ARRAY['capability_ops', 'business_user']) AS r, unnest(ARRAY['tools', 'memory']) AS m;
INSERT INTO "role_menu" ("role_id", "menu_id") VALUES ('capability_ops', 'approvals');

-- 区域 / 领域：组织字典文档里有就用文档（运营改过的名称和顺序），没有就用前端默认字典
INSERT INTO "region" ("id", "name", "sort", "updated_at")
SELECT btrim(e ->> 'id'), COALESCE(NULLIF(btrim(e ->> 'label'), ''), btrim(e ->> 'id')), (ord - 1)::int, now()
FROM "app_setting" s, jsonb_array_elements(CASE WHEN jsonb_typeof(s."value" -> 'regions') = 'array' THEN s."value" -> 'regions' ELSE '[]'::jsonb END) WITH ORDINALITY AS t(e, ord)
WHERE s."setting_key" = 'org-taxonomy' AND NULLIF(btrim(e ->> 'id'), '') IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "region" ("id", "name", "sort", "updated_at")
SELECT id, name, sort, now() FROM (VALUES
  ('hq', '机关', 0), ('apac', '亚太', 1), ('mea', '中东非', 2), ('latam', '拉美', 3),
  ('europe', '欧洲', 4), ('eurasia', '欧亚', 5), ('china', '中国区', 6)
) AS d(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM "region");

INSERT INTO "domain" ("id", "name", "sort", "updated_at")
SELECT btrim(e ->> 'id'), COALESCE(NULLIF(btrim(e ->> 'label'), ''), btrim(e ->> 'id')), (ord - 1)::int, now()
FROM "app_setting" s, jsonb_array_elements(CASE WHEN jsonb_typeof(s."value" -> 'depts') = 'array' THEN s."value" -> 'depts' ELSE '[]'::jsonb END) WITH ORDINALITY AS t(e, ord)
WHERE s."setting_key" = 'org-taxonomy' AND NULLIF(btrim(e ->> 'id'), '') IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "domain" ("id", "name", "sort", "updated_at")
SELECT id, name, sort, now() FROM (VALUES
  ('gtm', 'GTM', 0), ('mkt', 'MKT', 1), ('ecommerce', '电商', 2), ('service', '服务', 3), ('channel', '渠道', 4),
  ('retail', '零售', 5), ('hr', 'HR', 6), ('quality', '质运', 7), ('finance', '财经', 8)
) AS d(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM "domain");

-- 成员：邮箱统一小写，角色改外键
UPDATE "member" SET "email" = lower(btrim("email"));
ALTER TABLE "member" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "member" ADD CONSTRAINT "member_email_lowercase" CHECK ("email" = lower(btrim("email")));

ALTER TABLE "member" RENAME COLUMN "role" TO "role_id";
UPDATE "member" SET "role_id" = CASE
  WHEN "role_id" = 'workspace_admin' THEN 'super_admin'
  WHEN "role_id" = 'developer' THEN 'capability_ops'
  WHEN "role_id" IN ('super_admin', 'capability_ops', 'business_user', 'viewer') THEN "role_id"
  ELSE 'business_user'
END;
CREATE INDEX "member_role_idx" ON "member"("role_id");
CREATE UNIQUE INDEX "member_single_super_admin" ON "member"("role_id") WHERE "role_id" = 'super_admin';
ALTER TABLE "member" ADD CONSTRAINT "member_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 成员引用了字典里没有的区域 / 领域时补进字典，名称先用 id，避免丢归属
UPDATE "member" SET "region_id" = NULLIF(btrim("region_id"), '');
INSERT INTO "region" ("id", "name", "sort", "updated_at")
SELECT DISTINCT "region_id", "region_id", 1000, now() FROM "member" WHERE "region_id" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
ALTER TABLE "member" ADD CONSTRAINT "member_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "domain" ("id", "name", "sort", "updated_at")
SELECT DISTINCT btrim(d), btrim(d), 1000, now()
FROM "member", jsonb_array_elements_text(CASE WHEN jsonb_typeof("dept_ids") = 'array' THEN "dept_ids" ELSE '[]'::jsonb END) AS d
WHERE btrim(d) <> ''
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "member_domain" ("member_id", "domain_id", "position")
SELECT "id", btrim(d), min(ord)::int - 1
FROM "member", jsonb_array_elements_text(CASE WHEN jsonb_typeof("dept_ids") = 'array' THEN "dept_ids" ELSE '[]'::jsonb END) WITH ORDINALITY AS t(d, ord)
WHERE btrim(d) <> ''
GROUP BY "id", btrim(d);
ALTER TABLE "member_domain" ADD CONSTRAINT "member_domain_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_domain" ADD CONSTRAINT "member_domain_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "member" DROP COLUMN "dept_ids";
ALTER TABLE "member" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
