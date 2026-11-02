-- 菜单改两层：一级分组 + 二级菜单；角色菜单区分只看 / 可编辑；组织权限拆成成员、角色、部门；
-- 下线「展示配置」；新增默认角色「普通用户」，只有顶部五个菜单。

ALTER TABLE "menu" ADD COLUMN "parent_id" TEXT, ADD COLUMN "fixed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "role_menu" ADD COLUMN "can_edit" BOOLEAN NOT NULL DEFAULT true;

-- 一级分组：只用来归类，不分配给角色
INSERT INTO "menu" ("id", "name", "section", "icon", "sort") VALUES
  ('group-top', '顶部导航', 'top', 'fa-bars', 1),
  ('group-workspace', '工作平台', 'workspace', 'fa-briefcase', 2),
  ('group-platform', '能力配置', 'platform', 'fa-cubes', 3),
  ('group-ops', '运营设置', 'ops', 'fa-bullhorn', 4),
  ('group-system', '系统设置', 'system', 'fa-gear', 5),
  ('group-org', '组织权限', 'org', 'fa-shield-halved', 6);

-- 组织权限拆成三个二级菜单；原来有「组织权限」的角色三个都给、且可编辑
INSERT INTO "menu" ("id", "name", "section", "icon", "sort") VALUES
  ('org-members', '成员', 'org', 'fa-users', 600),
  ('org-roles', '角色', 'org', 'fa-user-shield', 610),
  ('org-depts', '部门', 'org', 'fa-sitemap', 620),
  ('warroom', '协作空间', 'workspace', 'fa-comments', 105);
INSERT INTO "role_menu" ("role_id", "menu_id", "can_edit")
SELECT rm."role_id", m.id, true FROM "role_menu" rm, unnest(ARRAY['org-members', 'org-roles', 'org-depts']) AS m(id)
WHERE rm."menu_id" = 'admin';

-- 展示配置下线；Agent Studio、案例库早已并入别的页面，不再单独授权
DELETE FROM "menu" WHERE "id" IN ('admin', 'presentation', 'agent-studio', 'cases');

UPDATE "menu" SET "parent_id" = 'group-top', "section" = 'top'
WHERE "id" IN ('home', 'ai-brief', 'market-external', 'market-internal', 'market-projects', 'market-tool', 'me', 'messages');
-- 资产详情、个人中心、我的消息跟着顶部导航走，所有登录用户都有
UPDATE "menu" SET "fixed" = true WHERE "id" IN ('market-tool', 'me', 'messages');
DELETE FROM "role_menu" WHERE "menu_id" IN ('market-tool', 'me', 'messages');
UPDATE "menu" SET "parent_id" = 'group-workspace', "section" = 'workspace' WHERE "id" IN ('ai-knowledge', 'ai-tasks', 'task', 'warroom', 'ai-map');
UPDATE "menu" SET "parent_id" = 'group-platform', "section" = 'platform'
WHERE "id" IN ('approvals', 'skills', 'agents', 'tools', 'office-scenes', 'kb', 'memory', 'automation', 'workflow', 'prompts');
UPDATE "menu" SET "parent_id" = 'group-ops', "section" = 'ops' WHERE "id" IN ('portal-ops', 'portal-dashboard');
UPDATE "menu" SET "parent_id" = 'group-system', "section" = 'system' WHERE "id" IN ('model-ops', 'executions');
UPDATE "menu" SET "parent_id" = 'group-org' WHERE "id" IN ('org-members', 'org-roles', 'org-depts');

-- 每个二级菜单都必须挂在分组下
DO $$
DECLARE
  orphans TEXT;
BEGIN
  SELECT string_agg("id", ', ') INTO orphans FROM "menu" WHERE "parent_id" IS NULL AND "id" NOT LIKE 'group-%';
  IF orphans IS NOT NULL THEN
    RAISE EXCEPTION '菜单没有归到任何分组：%', orphans;
  END IF;
END $$;

ALTER TABLE "menu" ADD CONSTRAINT "menu_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "menu_parent_idx" ON "menu"("parent_id");

-- 管理后台菜单只留给能力开发：业务用户、只读访客收回能力配置、运营、系统菜单
DELETE FROM "role_menu" rm USING "menu" m
WHERE rm."menu_id" = m."id" AND rm."role_id" IN ('business_user', 'viewer')
  AND m."parent_id" IN ('group-platform', 'group-ops', 'group-system', 'group-org');
-- 只读访客不能执行任务；业务用户、能力开发补上协作空间（与原「完整产品」展示方案一致）
DELETE FROM "role_menu" WHERE "role_id" = 'viewer' AND "menu_id" IN ('ai-tasks', 'task');
INSERT INTO "role_menu" ("role_id", "menu_id", "can_edit")
SELECT r, 'warroom', true FROM unnest(ARRAY['business_user', 'capability_ops']) AS r
WHERE EXISTS (SELECT 1 FROM "role" WHERE "id" = r)
ON CONFLICT DO NOTHING;

-- 默认角色「普通用户」：只有顶部五个菜单；新成员默认用它
INSERT INTO "role" ("id", "name", "description", "is_system", "updated_at")
VALUES ('member', '普通用户', '新成员默认角色，只有顶部五个菜单', true, now())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "role_menu" ("role_id", "menu_id", "can_edit")
SELECT 'member', id, true FROM unnest(ARRAY['home', 'ai-brief', 'market-external', 'market-internal', 'market-projects']) AS m(id)
ON CONFLICT DO NOTHING;
ALTER TABLE "member" ALTER COLUMN "role_id" SET DEFAULT 'member';
