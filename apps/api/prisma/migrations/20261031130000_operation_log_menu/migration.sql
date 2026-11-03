-- 组织权限增加「操作日志」：查看 Skill / Agent / 工具 / 办公场景的增删改。
-- 已经能进组织权限的角色默认可查看，不可编辑（这个页面本身没有写操作）。

INSERT INTO "menu" ("id", "name", "section", "icon", "sort", "parent_id") VALUES
  ('org-audit', '操作日志', 'org', 'fa-clipboard-list', 630, 'group-org');

INSERT INTO "role_menu" ("role_id", "menu_id", "can_edit")
SELECT DISTINCT rm."role_id", 'org-audit', false
FROM "role_menu" rm
WHERE rm."menu_id" IN ('org-members', 'org-roles', 'org-depts')
ON CONFLICT DO NOTHING;
