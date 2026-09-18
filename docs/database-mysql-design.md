# MSS Claw 数据库重构设计：SQLite → MySQL 兼容云数据库

> 状态：草案 v0.1（2026-09-17）
> 已确认：全局账号（一个邮箱一个账号一份密码）；目标库为 MySQL 兼容云数据库（按 MySQL 8.0 语法设计）
> 待确认：迁移路径（两步走 / 一次到位 / 只换库），以及文末「待确认问题」

---

## 0. 总览

现有 11 张业务表 → 新设计 42 张核心表 + 2 张可选表，最终删除 `CenterRecord`。

| 域 | 表 | 作用域 | 主要取代 |
|---|---|---|---|
| A 租户与身份 | `workspace` | 全局 | Workspace |
| | `account` | 全局 | doc:members 中的人 |
| | `account_credential` | 全局 | doc:auth-credentials |
| | `workspace_member` | 工作区 | doc:members |
| | `auth_session` | 全局 | doc:auth-sessions |
| | `chat_session` | 工作区 | Workspace.catalogJson.chats |
| B 资产目录 | `tool` | 全局 | global-tools 单例 + marketplace.tools + CenterRecord(tool) |
| | `skill` | 工作区 | marketplace.skills + CenterRecord(skill) |
| | `skill_version` | 工作区 | skill.versions[] |
| | `agent` | 工作区 | marketplace.agents + CenterRecord(agent) |
| | `agent_skill` | 工作区 | agent.skillIds[] |
| | `automation` | 工作区 | marketplace.automations |
| | `kb_document` | 工作区 | marketplace.kbDocs |
| | `office_scene` | 工作区 | doc:internal-office-scenes |
| | `center_resource` | 工作区 | CenterRecord(prompt/workflow/knowledge/memory) |
| C 运营与治理 | `portal_content` | 工作区 | CenterRecord(portal-content) |
| | `asset_approval` | 工作区 | doc:asset-approvals.items |
| | `asset_approval_watch` | 工作区 | doc:asset-approvals.watchedByUserId |
| | `audit_log` | 工作区 | doc:audit-log |
| | `collection_revision` | 工作区 | 各整表替换接口的 revision |
| D 个人数据与互动 | `market_favorite` | 工作区 | doc:market-favorites + MarketUserInteraction.favorited |
| | `market_user_vote` | 工作区 | MarketUserInteraction.vote |
| | `market_recent_view` | 工作区 | doc:market-recent |
| | `market_hidden_item` | 工作区 | doc:market-hidden |
| | `skill_review` | 工作区 | doc:skill-reviews |
| E 消息与资讯 | `inbox_message` | 工作区 | InboxMessageRecord |
| | `inbox_message_state` | 工作区 | InboxUserMessageState |
| | `station_announcement` | 工作区 | doc:station-announcements |
| | `ai_news_post` | 工作区 | doc:ai-news |
| | `ai_news_feed_item` | 全局 | doc:ai-news-archive |
| | `ai_brief_email_subscription` | 工作区 | AiBriefEmailSubscription |
| F 执行与 AI | `execution` | 工作区 | CenterRecord(execution) |
| | `ai_knowledge_draft` | 工作区 | CenterRecord(ai-knowledge-draft) |
| | `ai_knowledge_solution` | 工作区 | CenterRecord(ai-knowledge-solution) |
| | `llm_model_config` | 工作区 | doc:llm-config |
| G 配置 | `workspace_setting` | 工作区 | 其余纯配置文档（见 G1 键清单） |
| | `system_setting` | 全局 | 工具目录版本、快讯同步状态 |
| H 统计事实 | `market_engagement_stat` | 工作区 | MarketEngagement |
| | `market_engagement_event` | 工作区 | MarketEngagementEvent |
| | `portal_page_view` | 工作区 | PortalPageView |
| | `portal_daily_login` | 工作区 | PortalDailyLogin |
| | `portal_conversion_event` | 工作区 | PortalConversionEvent |
| 可选 | `analytics_quota` | 工作区 | 替代「COUNT 后插入」式限流（见 H6） |
| | `blob_object` | 工作区 | data/blobs/**/*.json 元数据旁车文件 |

---

## 1. 通用约定

### 1.1 命名与字符集

- 表名、列名全部小写 snake_case；Prisma 模型仍用 PascalCase / camelCase，通过 `@@map` / `@map` 映射。
  云数据库的 `lower_case_table_names` 一般在实例创建时确定且不可改，Windows 与 Linux 默认值也不同；全小写表名不受影响。
- 字符集 `utf8mb4`，排序规则 `utf8mb4_bin`（区分大小写、不做尾部空格等价）。
  原因：事件 ID、令牌哈希、资产 ID 都要求精确匹配；默认的 `*_ci` 排序规则会把 `abc…` 与 `ABC…` 判为重复。
  注意：Prisma 生成的 MySQL 建表语句默认带 `COLLATE utf8mb4_unicode_ci`，生成迁移后需统一替换（实施时验证 Prisma 是否把它识别为漂移）。

### 1.2 类型

| 用途 | 类型 | Prisma |
|---|---|---|
| 工作区 ID | `VARCHAR(64)` | `String @db.VarChar(64)` |
| 成员 ID | `VARCHAR(64)` | 同上 |
| 资产 ID（工具/Skill/Agent/内容） | `VARCHAR(128)`；事件里的 content_id 为 `VARCHAR(200)` | |
| 账号 ID | `CHAR(36)` UUID | `String @db.Char(36) @default(uuid())` |
| SHA-256 十六进制 | `CHAR(64)` | `@db.Char(64)` |
| 邮箱 | `VARCHAR(254)` | |
| 枚举类取值 | `VARCHAR(8~32)`，取值在「说明」列列出，由应用层 Zod 校验 | 不用 MySQL ENUM，便于扩展 |
| 布尔 | `TINYINT(1)` | `Boolean` |
| 计数 | `INT` / `INT UNSIGNED` | `Int @db.UnsignedInt` |
| 事实表自增主键 | `BIGINT UNSIGNED AUTO_INCREMENT` | `BigInt @id @default(autoincrement()) @db.UnsignedBigInt`（不对外返回，避免 bigint 序列化问题） |
| 时间 | `DATETIME(3)`，一律存 UTC | `DateTime @db.DateTime(3)` |
| 业务日 | `CHAR(10)`，`YYYY-MM-DD`，北京时间 | 保留现有 dateKey 口径 |
| 短文本 / 长文本 | `VARCHAR(n)` / `TEXT`（≤64KB）/ `MEDIUMTEXT`（≤16MB） | `@db.Text` / `@db.MediumText` |
| 整体读写的结构化字段 | `JSON` | `Json` |

### 1.3 通用规则

- **通用时间列**：除特别说明外，每张业务表都有
  `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` 和 `updated_at DATETIME(3) NOT NULL`（Prisma `@updatedAt`）。
  下文表头标注「＋通用时间列」的即包含这两列，不在字段表里重复。
- **工作区外键**：业务表的 `workspace_id` 外键到 `workspace.id`，`ON DELETE CASCADE`。统计事实表（H 域）不加外键，资产或工作区删除后历史统计要保留。
- **乐观锁**：不再把 revision 放进 JSON。单行对象用本行的 `revision` 列；整表替换类接口（成员表、办公场景等）用 `collection_revision`。并发更新写成 `UPDATE ... WHERE revision = ?`，影响行数为 0 即冲突，不需要 raw SQL。
- **JSON 列**只放整体读写、不参与筛选或关联的展示字段。需要筛选、排序、统计或做唯一约束的字段一律成为列。
- **索引**只为代码里实际存在的查询建；主键前缀能覆盖的不再单独建（例如按 `workspace_id` 读全部 Skill 直接走主键）。外键列 MySQL 会自动建索引。
- **成员 ID 保持旧值**（如 `u-mcyo`）。统计里 `visitor_hash = sha256("mss-claw:portal-uv:v1:" + workspaceId + ":account:" + userId)`，换 ID 会断掉历史 UV。
- **接口契约不变**：`/docs/:kind` 整份读写、`/marketplace` 快照、`/sessions` 等接口的请求和响应结构保持不变，由后端在新表和旧结构之间转换。

---

## A. 租户与身份

### A1 `workspace` 工作区　＋通用时间列

来源：`Workspace` 表；`catalogJson.workspace`、`catalogJson.defaultChatId` 与列重复，不再保存。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `ws-cn-marketing` |
| name | VARCHAR(120) | | | |
| namespace | VARCHAR(120) | | | |
| description | VARCHAR(500) | | `''` | |
| member_count | INT UNSIGNED | | 0 | 目录展示用人数（种子值）；真实人数从 workspace_member 统计 |
| default_chat_id | VARCHAR(64) | | `'default'` | |
| allow_demo_password | TINYINT(1) | | 0 | 是否允许演示口令登录（auth-credentials.policy.allowDemoPassword）；内置工作区迁移为 1 |
| llm_default_model_id | VARCHAR(128) | ✓ | | 组织默认模型（llm-config.defaultModelId） |
| llm_selected_model_id | VARCHAR(128) | ✓ | | 当前选用模型（llm-config.model） |
| catalog_resources | JSON | ✓ | | 资源树展示数据（catalogJson.resources） |

主键：`id`。

### A2 `account` 全局账号　＋通用时间列

来源：各工作区 `doc:members` 中的成员，按归一化邮箱合并。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | CHAR(36) | | uuid | 主键 |
| email | VARCHAR(254) | | | 归一化：去空格、小写、`@company.com` → `@huawei.com`（沿用现有规则） |
| display_name | VARCHAR(120) | | | 成员 name；多工作区不一致时取最近更新的记录 |
| avatar | VARCHAR(64) | | `'bg-zinc-600'` | 头像色块 class |
| status | VARCHAR(16) | | `'active'` | `active` / `disabled`（全局停用；单个工作区停用在 workspace_member.status） |
| last_login_at | DATETIME(3) | ✓ | | 新增；替代成员表里 `lastActive: '刚刚'` 这类文案 |

主键：`id`；唯一：`uk_account_email (email)`。

### A3 `account_credential` 账号密码　＋通用时间列

来源：各工作区 `doc:auth-credentials.credentials[email]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| account_id | CHAR(36) | | | 主键；外键 → account.id，级联删除 |
| algorithm | VARCHAR(16) | | `'sha256-salt'` | 现有算法 `sha256(salt + ":" + password)`；预留 `scrypt` / `argon2id`，登录成功时可平滑升级 |
| salt | VARCHAR(128) | | | |
| password_hash | VARCHAR(255) | | | |
| password_updated_at | DATETIME(3) | | | credentials[email].updatedAt |

迁移规则：同一邮箱在多个工作区有不同凭证时，保留 `updatedAt` 最新的一份，并输出冲突清单（邮箱、涉及工作区、保留来源）。

### A4 `workspace_member` 工作区成员　＋通用时间列

来源：`doc:members.members[]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一；**保留旧 id**（members[].id） |
| account_id | CHAR(36) | | | 外键 → account.id |
| role | VARCHAR(32) | | `'business_user'` | `super_admin` / `capability_ops` / `business_user` / `viewer` |
| status | VARCHAR(16) | | `'active'` | `active` / `invited` / `suspended` |
| dept_ids | JSON | | `[]` | 机关职能（领域）归属 deptIds |
| region_id | VARCHAR(64) | ✓ | | 一线区域 regionId |
| position | INT UNSIGNED | | 0 | 成员表顺序（整表 PUT 保序） |

主键：`(workspace_id, member_id)`；唯一：`uk_member_account (workspace_id, account_id)`；索引：`idx_member_account (account_id)`。
整表替换并发控制：`collection_revision(workspace_id, 'members')`。
兼容：GET members 返回的 `name` / `email` / `avatar` 取自 account，`lastActive` 由 `last_login_at` 生成文案。

### A5 `auth_session` 登录会话

来源：`doc:auth-sessions.sessions[token]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| token_hash | CHAR(64) | | | 主键；SHA-256(令牌)，**库里不存明文令牌** |
| account_id | CHAR(36) | | | 外键 → account.id，级联删除 |
| issued_workspace_id | VARCHAR(64) | | | 登录时所在工作区（auth.workspaceId） |
| auth_method | VARCHAR(16) | | | `password` / `demo`；访问的工作区不允许演示口令时拒绝 demo 会话 |
| expires_at | DATETIME(3) | | | 登录后 7 天 |
| last_seen_at | DATETIME(3) | ✓ | | 新增 |
| created_at | DATETIME(3) | | 当前时间 | 无 updated_at |

索引：`idx_session_account (account_id)`、`idx_session_expires (expires_at)`（定时清理过期会话）。
不再需要：`user` 快照（每次按工作区成员表重建）、`credFingerprint`（全局账号只有一份凭证）。
迁移：未过期的旧令牌算出哈希后迁入，已登录用户不用重新登录。

### A6 `chat_session` 对话 / 任务会话　＋通用时间列

来源：`Workspace.catalogJson.chats[chatId]`（ChatConfig）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一；chat id |
| owner_member_id | VARCHAR(64) | ✓ | | ownerUserId；空表示协作空间（WarRoom）或历史共享会话 |
| owner_email | VARCHAR(254) | ✓ | | ownerEmail（兼容字段） |
| type | VARCHAR(16) | | | `bot` / `group` |
| session_group | VARCHAR(16) | ✓ | | `pinned` / `agents` |
| title | VARCHAR(255) | | | |
| status | VARCHAR(32) | | `''` | |
| icon | VARCHAR(100) | | `''` | |
| icon_bg | VARCHAR(100) | ✓ | | |
| color | VARCHAR(100) | | `''` | |
| badge | VARCHAR(32) | ✓ | | |
| agent_id | VARCHAR(128) | ✓ | | |
| skill_id | VARCHAR(128) | ✓ | | 由场景技能开工时记录 |
| action_type | VARCHAR(16) | ✓ | | `marketing` / `knowledge` |
| task_source | VARCHAR(16) | ✓ | | `skill` / `expert` / `case_demo` / `embedded` / `other` |
| business_scenario_id | VARCHAR(8) | ✓ | | `S1`–`S8` |
| admin_member_id | VARCHAR(64) | ✓ | | WarRoom 管理员 adminId |
| members | JSON | ✓ | | WarRoom 成员 `[{id,name,email,avatar,role,canUseAi}]` |
| prompts | JSON | | `[]` | 推荐提问 |
| history | JSON | | `[]` | 消息数组 `[{role,text,name,avatar,streaming,planId,steps,...}]`；单会话消息量变大后再拆 chat_message 表 |
| pinned_at | DATETIME(3) | ✓ | | pinnedAt（毫秒） |

主键：`(workspace_id, id)`；索引：`idx_chat_owner (workspace_id, owner_member_id, updated_at)`。
created_at 取 createdAt（毫秒）。

---

## B. 资产目录

### B1 `tool` 工具（全局）　＋通用时间列

来源：`CenterRecord id=global-tools` 的 `tools[]`（当前权威源，77 条）。各工作区 `marketplace.tools`（164–165 条）和 `CenterRecord kind=tool`（180 条）是旧投影，不迁移，只用于核对差异。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(128) | | | 主键 |
| name | VARCHAR(200) | | | |
| market_title | VARCHAR(200) | ✓ | | 外精选卡主标题 marketTitle |
| description | TEXT | | | desc |
| card_summary | VARCHAR(500) | ✓ | | 卡片核心作用 |
| category | VARCHAR(16) | | | `connector` / `external` / `platform` |
| source_type | VARCHAR(16) | | | `internal` / `external` |
| market_shelf | VARCHAR(16) | | `'none'` | `external` 外部工具精选 / `internal` 内部办公推荐 / `none` 仅配置目录 |
| region | VARCHAR(16) | ✓ | | `overseas` / `domestic`（外部工具） |
| company | VARCHAR(120) | ✓ | | 厂商 |
| author | VARCHAR(120) | | `''` | |
| publisher_name | VARCHAR(120) | ✓ | | publisher |
| publisher_member_id | VARCHAR(64) | ✓ | | publisherUserId |
| published | TINYINT(1) | | 0 | 是否上架 |
| visibility | VARCHAR(16) | | `'public'` | `public` / `org` / `private` |
| icon | VARCHAR(100) | | `'fa-cube'` | Font Awesome class |
| logo_url | MEDIUMTEXT | ✓ | | 可能是 data URL；建议后续改存文件（见待确认问题） |
| homepage_url | VARCHAR(2048) | ✓ | | |
| docs_url | VARCHAR(2048) | ✓ | | |
| media_url | VARCHAR(2048) | ✓ | | |
| screenshot_url | VARCHAR(2048) | ✓ | | |
| version_label | VARCHAR(64) | ✓ | | |
| delivery_form | VARCHAR(16) | ✓ | | `web` / `download_only` |
| connector_type | VARCHAR(64) | ✓ | | 内部连接器类型 |
| tool_type_id | VARCHAR(48) | ✓ | | 主工具类型 |
| tool_type_ids | JSON | | `[]` | 所属工具类型列表 |
| tool_type_labels | JSON | | `[]` | 工具类型展示名 |
| external_category_ranks | JSON | | `{}` | `{类型id: 排序值}` |
| external_sort_order | INT | ✓ | | 「全部」视图顺序 |
| external_sort_rank | INT | ✓ | | 最优排序 |
| best_for | VARCHAR(500) | ✓ | | 最适合场景 |
| product_intro | TEXT | ✓ | | 产品详细介绍 |
| core_capabilities | JSON | | `[]` | 核心能力标签 |
| usage_guide | JSON | | `[]` | 站内使用指导步骤 |
| tags | JSON | | `[]` | |
| scenario_tags | JSON | | `[]` | |
| business_scenario_ids | JSON | | `[]` | `S1`–`S8` |
| owner_dept_ids | JSON | | `[]` | |
| owner_region_id | VARCHAR(64) | ✓ | | |
| invokes | INT UNSIGNED | | 0 | 调用次数展示值 |
| featured_in_find_cases | TINYINT(1) | ✓ | | 旧精选字段，只读兼容 |

主键：`id`。全局工具目前 77 条，整表读取，不加二级索引。
目录版本号（externalCatalogVersion 等）移到 `system_setting('tool-catalog.meta')`。

### B2 `skill` Skill　＋通用时间列

来源：`marketplace.skills[]`（权威）；`CenterRecord kind=skill` 投影不迁移。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| name | VARCHAR(200) | | | 主展示名（= nameZh） |
| name_en | VARCHAR(200) | ✓ | | nameEn |
| description | TEXT | | | desc / descZh |
| description_en | TEXT | ✓ | | descEn |
| category | VARCHAR(16) | | `'office'` | `office` / `manage` / `process` / `experience` |
| command | VARCHAR(128) | | `''` | 如 `/mss-translate` |
| author | VARCHAR(120) | | `''` | |
| publisher_name | VARCHAR(120) | ✓ | | publisher |
| publisher_member_id | VARCHAR(64) | ✓ | | publisherUserId |
| version | VARCHAR(32) | | `'1.0'` | 当前版本 |
| connector | VARCHAR(255) | | `''` | |
| published | TINYINT(1) | | 0 | 发布（终审通过后前台展示） |
| callable | TINYINT(1) | ✓ | | 上架可调用；NULL 表示按 published 兼容 |
| featured_in_mss_market | TINYINT(1) | ✓ | | Skill Hub 精选；NULL 回退静态白名单。迁移时合并旧字段 featuredInDoTask |
| business_scenario_id | VARCHAR(8) | ✓ | | `S1`–`S8` |
| source_type | VARCHAR(16) | ✓ | | `internal` / `external` |
| visibility | VARCHAR(16) | | `'public'` | `public` / `org` / `private` |
| owner_region_id | VARCHAR(64) | ✓ | | |
| owner_region_ids | JSON | | `[]` | 历史多区域字段 |
| owner_dept_ids | JSON | | `[]` | |
| invokes | INT UNSIGNED | | 0 | |
| icon | VARCHAR(100) | | `'fa-puzzle-piece'` | |
| icon_url | MEDIUMTEXT | ✓ | | 自定义头像，可能是 data URL |
| accent_color | VARCHAR(32) | ✓ | | |
| instructions | MEDIUMTEXT | ✓ | | Skill 正文（执行时注入） |
| usage_notes | TEXT | ✓ | | 使用须知 |
| package_blob_id | CHAR(32) | ✓ | | 当前 Skill 包 packageBlob.id |
| package_meta | JSON | ✓ | | `{name,size,url,uploadedAt}`；上线 blob_object 表后可去掉 |
| tags | JSON | | `[]` | |
| search_keywords | JSON | | `[]` | |
| scenario_tags | JSON | | `[]` | |
| plan_steps | JSON | | `[]` | 默认执行计划 |
| detail | JSON | ✓ | | 展示型详情：`cases`、`caseAttachments`、`envInfo`、`securityScan` |
| trace_evaluation | JSON | ✓ | | TRACE 五维评测报告 |
| updated_by | VARCHAR(120) | ✓ | | |

主键：`(workspace_id, id)`。
资产 JSON 里 `createdAt` / `updatedAt` 为 `YYYY-MM-DD` 的，按北京时间 00:00 入库，读取时按原格式输出。

### B3 `skill_version` Skill 版本　＋通用时间列

来源：`skill.versions[]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一 |
| skill_id | VARCHAR(128) | | | 主键之一；外键 → skill，级联删除 |
| version | VARCHAR(32) | | | 主键之一 |
| notes | TEXT | ✓ | | |
| status | VARCHAR(16) | | `'active'` | `active` / `retired` |
| package_blob_id | CHAR(32) | ✓ | | 该版本自己的包 |
| package_meta | JSON | ✓ | | |
| published_at | DATETIME(3) | ✓ | | |

主键：`(workspace_id, skill_id, version)`。

### B4 `agent` Agent　＋通用时间列

来源：`marketplace.agents[]`（权威）；`CenterRecord kind=agent` 投影不迁移。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| name | VARCHAR(200) | | | |
| description | TEXT | | | desc |
| value_proposition | VARCHAR(500) | ✓ | | 一句话价值 |
| category | VARCHAR(16) | | `'office'` | `office` / `manage` / `process` / `experience` |
| biz_line | VARCHAR(64) | | `''` | |
| home_tag | VARCHAR(64) | | `''` | 首页分类（兼容 DeptId） |
| author | VARCHAR(120) | | `''` | |
| publisher_name | VARCHAR(120) | ✓ | | |
| publisher_member_id | VARCHAR(64) | ✓ | | |
| maintainer | VARCHAR(120) | ✓ | | |
| published | TINYINT(1) | | 0 | |
| featured_in_do_task | TINYINT(1) | ✓ | | 做任务 · 场景专家精选 |
| lifecycle_status | VARCHAR(32) | ✓ | | 成熟度（可运行 / 建设中） |
| business_scenario_id | VARCHAR(8) | ✓ | | |
| source_type | VARCHAR(16) | ✓ | | |
| visibility | VARCHAR(16) | | `'public'` | |
| invokes | INT UNSIGNED | | 0 | |
| primary_skill_id | VARCHAR(128) | ✓ | | 调用时优先挂载的主 Skill |
| chat_id | VARCHAR(64) | | `''` | |
| icon | VARCHAR(100) | | `'fa-robot'` | |
| color | VARCHAR(100) | | `''` | |
| avatar_preset_id | VARCHAR(64) | ✓ | | |
| avatar_url | MEDIUMTEXT | ✓ | | 可能是 data URL |
| system_prompt | MEDIUMTEXT | ✓ | | |
| demo_prompt | TEXT | ✓ | | |
| demo_url | VARCHAR(2048) | ✓ | | |
| solution_doc_url | VARCHAR(2048) | ✓ | | |
| feedback_url | VARCHAR(2048) | ✓ | | |
| install_command | VARCHAR(1000) | ✓ | | |
| version | VARCHAR(32) | ✓ | | |
| version_summary | TEXT | ✓ | | |
| requires_human_review | TINYINT(1) | ✓ | | |
| package_blob_id | CHAR(32) | ✓ | | 执行包 |
| package_meta | JSON | ✓ | | |
| plan_steps | JSON | | `[]` | |
| scenario_tags | JSON | | `[]` | |
| capability_type_ids | JSON | | `[]` | |
| owner_dept_ids | JSON | | `[]` | |
| owner_region_ids | JSON | | `[]` | |
| detail | JSON | ✓ | | 展示型详情：`capabilities`、`targetUsers`、`capabilityBoundaries`、`suitableFor`、`notSuitableFor`、`inputOutput`、`quickStart`、`cases`、`caseAttachments`、`environment` |

主键：`(workspace_id, id)`。
`skillIds` 移到 `agent_skill`。

### B5 `agent_skill` Agent 编排的 Skill

来源：`agent.skillIds[]`（保持顺序）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一 |
| agent_id | VARCHAR(128) | | | 主键之一；外键 → agent，级联删除 |
| skill_id | VARCHAR(128) | | | 主键之一；**不加外键**（见下） |
| position | SMALLINT UNSIGNED | | 0 | 编排顺序 |

主键：`(workspace_id, agent_id, skill_id)`；索引：`idx_agent_skill_skill (workspace_id, skill_id)`。
skill_id 不加外键：本地数据里 `ws-3c-latam` 的 10 条引用有 9 条指向本工作区不存在的 Skill（可能是前端种子）。删除 Skill 时在同一事务里清掉对应行，取代现在 `putMarketplace` 里的手动清理。

### B6 `automation` 自动化　＋通用时间列

来源：`marketplace.automations[]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| name | VARCHAR(200) | | | |
| description | TEXT | | | desc |
| agent_id | VARCHAR(128) | ✓ | | |
| skill_ids | JSON | | `[]` | |
| schedule | VARCHAR(128) | | `''` | 调度描述文案 |
| enabled | TINYINT(1) | | 0 | |
| last_run_label | VARCHAR(64) | ✓ | | lastRun 文案 |

主键：`(workspace_id, id)`。

### B7 `kb_document` 知识库文档　＋通用时间列

来源：`marketplace.kbDocs[]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| title | VARCHAR(255) | | | |
| description | TEXT | | | desc |
| collection_id | VARCHAR(64) | | `''` | collection |
| doc_type | VARCHAR(32) | | `''` | type |
| size_label | VARCHAR(32) | | `''` | size，如 `2.3MB` |
| pages | INT UNSIGNED | | 0 | |
| clearance | VARCHAR(32) | | `''` | 密级 |
| indexed | TINYINT(1) | | 0 | |
| chunks | INT UNSIGNED | | 0 | |
| author | VARCHAR(120) | | `''` | |
| tags | JSON | | `[]` | |
| chunk_texts | JSON | ✓ | | |
| source_updated_at | DATETIME(3) | ✓ | | 文档自身的 updatedAt |

主键：`(workspace_id, id)`。

### B8 `office_scene` 内部办公场景　＋通用时间列

来源：`doc:internal-office-scenes.entries[]`。统计里的 contentId 为 `office-scene-<id>`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(48) | | | 主键之一；`^[a-z0-9][a-z0-9-]{0,47}$` |
| label | VARCHAR(120) | | | |
| english | VARCHAR(80) | | `''` | |
| description | TEXT | | | 最长 4000 字 |
| icon | VARCHAR(100) | | `'fa-cube'` | |
| visible | TINYINT(1) | | 1 | 是否上架展示 |
| position | SMALLINT UNSIGNED | | 0 | 列表顺序 |
| tool_id | VARCHAR(128) | ✓ | | 绑定工具（现有校验最多 1 个） |
| tool_blurb | VARCHAR(500) | ✓ | | 该工具在场景下的说明 |

主键：`(workspace_id, id)`。
整表替换并发控制：`collection_revision(workspace_id, 'office-scenes')`；文档 `version` 由代码常量给出。

### B9 `center_resource` 原型中心资源　＋通用时间列

来源：`CenterRecord kind in (prompt, workflow, knowledge, memory)`，以及前端种子的覆盖写入。数据少、嵌套深（策略、反思日志、文档列表），暂不拆表。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| kind | VARCHAR(16) | | | 主键之一；`prompt` / `workflow` / `knowledge` / `memory` |
| id | VARCHAR(128) | | | 主键之一 |
| name | VARCHAR(200) | ✓ | | 冗余展示名 |
| status | VARCHAR(32) | ✓ | | lifecycle / status / pipelineStage |
| payload | JSON | | | 原 payload |

主键：`(workspace_id, kind, id)`。
中心接口里的 agent / skill / tool 不再写投影，读取时由 B1/B2/B4 映射。

---

## C. 运营与治理

### C1 `portal_content` 门户知识地图内容　＋通用时间列

来源：`CenterRecord kind=portal-content` 的 `items[]`（PortalContentItem）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| type | VARCHAR(16) | | | `case` / `playbook` / `insight` / `training` / `news` |
| title | VARCHAR(255) | | | |
| description | TEXT | | | desc |
| icon | VARCHAR(100) | | `''` | |
| published | TINYINT(1) | | 1 | |
| is_gold | TINYINT(1) | | 0 | 金案例 |
| source_type | VARCHAR(16) | ✓ | | |
| visibility | VARCHAR(16) | | `'public'` | |
| publisher_name | VARCHAR(120) | ✓ | | |
| publisher_member_id | VARCHAR(64) | ✓ | | |
| owner_dept_ids | JSON | | `[]` | |
| owner_region_id | VARCHAR(64) | ✓ | | |
| scenario_tags | JSON | | `[]` | |
| homepage_url | VARCHAR(2048) | ✓ | | |
| kb_doc_id | VARCHAR(128) | ✓ | | 关联资产 |
| agent_id | VARCHAR(128) | ✓ | | |
| skill_id | VARCHAR(128) | ✓ | | |
| primary_skill_id | VARCHAR(128) | ✓ | | |
| tool_id | VARCHAR(128) | ✓ | | |
| pain_point | TEXT | ✓ | | |
| impact_metric | VARCHAR(255) | ✓ | | |
| steps | JSON | | `[]` | 打样三步走 |
| package_version | VARCHAR(32) | ✓ | | |
| preview_file | JSON | ✓ | | `{name,mimeType,size,url,blobId,kind}`；dataUrl 不入库，迁移时转存文件 |
| layout_preview_file | JSON | ✓ | | 同上 |
| position | INT UNSIGNED | | 0 | 列表顺序 |
| published_at | DATETIME(3) | | | |

主键：`(workspace_id, id)`。
整表替换并发控制：`collection_revision(workspace_id, 'portal-content')`。

### C2 `asset_approval` 资产审批单　＋通用时间列

来源：`doc:asset-approvals.items[]`（AssetApprovalRecord）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `apr_<毫秒>_<随机>` |
| workspace_id | VARCHAR(64) | | | 外键 |
| asset_kind | VARCHAR(16) | | | `agent` / `skill` / `tool` / `kb` / `automation` / `portal` |
| asset_id | VARCHAR(128) | | | |
| asset_name | VARCHAR(200) | | | |
| submitter_member_id | VARCHAR(64) | ✓ | | submitterUserId |
| submitter_name | VARCHAR(120) | | | |
| step_index | TINYINT UNSIGNED | | 0 | 0 提交人完成 / 1 待业务主管 / 2 待质量运营 / 3 全部通过 |
| status | VARCHAR(16) | | `'pending'` | `pending` / `approved` / `cancelled` / `rejected` |
| reasons | JSON | | `[]` | `publish_executable` / `visibility_public` / `update_version` / `unpublish_skill` |
| note | TEXT | ✓ | | 更新说明 / 下架理由 |
| reject_note | TEXT | ✓ | | |
| target_version | VARCHAR(32) | ✓ | | |
| package_blob_id | CHAR(32) | ✓ | | 更新申请上传的包 |
| package_name | VARCHAR(255) | ✓ | | |
| package_url | VARCHAR(512) | ✓ | | |
| package_size | BIGINT UNSIGNED | ✓ | | |
| unpublish_mode | VARCHAR(16) | ✓ | | `all` / `versions` |
| unpublish_versions | JSON | ✓ | | |
| decided_at | DATETIME(3) | ✓ | | decidedAt（毫秒） |
| decided_by_member_id | VARCHAR(64) | ✓ | | 新增 |

主键：`id`；索引：`idx_approval_asset (workspace_id, asset_kind, asset_id, status)`（删除 Skill 前检查是否有待审批）。
created_at / updated_at 取 createdAt / updatedAt（毫秒）。

### C3 `asset_approval_watch` 审批关注

来源：`doc:asset-approvals.watchedByUserId[uid][]`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一 |
| asset_kind | VARCHAR(16) | | | 主键之一 |
| asset_id | VARCHAR(128) | | | 主键之一 |
| asset_name | VARCHAR(200) | | | 快照 |
| created_at | DATETIME(3) | | 当前时间 | 无 updated_at |

主键：`(workspace_id, member_id, asset_kind, asset_id)`。

### C4 `audit_log` 审计日志（只追加）

来源：`doc:audit-log.logs[]`（AuditLogEntry）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | BIGINT UNSIGNED | | 自增 | 主键 |
| workspace_id | VARCHAR(64) | | | 外键 |
| entry_id | VARCHAR(64) | | | 客户端生成的 id，用于幂等 |
| occurred_at | DATETIME(3) | | | at |
| category | VARCHAR(16) | | | `auth` / `browse` / `task` / `model` / `members` / `org` / `rbac` / `asset` |
| action | VARCHAR(64) | | | 如 `login`、`task.execute` |
| module | VARCHAR(64) | | | |
| detail | TEXT | | | |
| actor_member_id | VARCHAR(64) | ✓ | | 新增（现在只存姓名和邮箱） |
| actor_name | VARCHAR(120) | | | userName |
| actor_email | VARCHAR(254) | ✓ | | userEmail |
| actor_role | VARCHAR(32) | ✓ | | role |
| dept_ids | JSON | | `[]` | 操作时的领域归属 |
| region_id | VARCHAR(64) | ✓ | | 操作时的区域归属 |
| created_at | DATETIME(3) | | 当前时间 | 无 updated_at |

主键：`id`；唯一：`uk_audit_entry (workspace_id, entry_id)`；索引：`idx_audit_time (workspace_id, occurred_at)`（取最近 N 条、按时间清理）。
整份 PUT 的兼容：只插入新条目，不按提交列表删除旧条目；GET 返回最近 N 条；保留期由定时清理控制。

### C5 `collection_revision` 整表替换的版本号

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| collection | VARCHAR(48) | | | 主键之一；`members` / `office-scenes` / `portal-content` / `auth-credentials` |
| revision | INT UNSIGNED | | 0 | 来自原文档 revision |
| updated_by_member_id | VARCHAR(64) | ✓ | | |
| updated_at | DATETIME(3) | | | 无 created_at |

主键：`(workspace_id, collection)`。
写法：同一事务里先 `UPDATE collection_revision SET revision = revision + 1 WHERE ... AND revision = ?`，影响 0 行即返回 409，否则再写明细行。

---

## D. 个人数据与互动

### D1 `market_favorite` 收藏（唯一来源）　＋通用时间列

来源：`doc:market-favorites.byUserId[uid][]`（MarketFavoriteItem）；`MarketUserInteraction.favorited`。
现状是前端同时写收藏文档和互动接口的 favorite 动作，存了两份；新设计只保留这一处。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一 |
| shelf_kind | VARCHAR(16) | | | 主键之一；`external` / `internal` / `projects` |
| asset_type | VARCHAR(16) | | `''` | 主键之一；`tool` / `skill` / `agent` / `office-scene`；旧记录没有时为空串 |
| asset_id | VARCHAR(128) | | | 主键之一；item.id |
| content_id | VARCHAR(200) | | | 统计用 contentId（办公场景为 `office-scene-<id>`） |
| title | VARCHAR(200) | | | 展示快照 |
| icon | VARCHAR(100) | ✓ | | |
| logo_url | VARCHAR(1024) | ✓ | | |
| note | VARCHAR(1000) | ✓ | | 用户备注 |

主键：`(workspace_id, member_id, shelf_kind, asset_type, asset_id)`；索引：`idx_favorite_content (workspace_id, content_id)`（按资产统计收藏数）。
created_at 取 at（毫秒）。收藏数改为从本表统计，或只由一条写入路径维护 `market_engagement_stat.favorites`，避免两条路径重复计数。

### D2 `market_user_vote` 点赞 / 点踩　＋通用时间列

来源：`MarketUserInteraction`（去掉 favorited 列）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一；userId |
| content_id | VARCHAR(200) | | | 主键之一 |
| vote | VARCHAR(8) | ✓ | | `like` / `dislike` / NULL（已取消） |

主键：`(workspace_id, member_id, content_id)`。

### D3 `market_recent_view` 最近浏览

来源：`doc:market-recent.byUserId[uid][]`（RecentMarketItem）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一 |
| shelf_kind | VARCHAR(16) | | | 主键之一 |
| asset_type | VARCHAR(16) | | `''` | 主键之一（同 id 的 Skill 与 Agent 可以并存） |
| asset_id | VARCHAR(128) | | | 主键之一 |
| title | VARCHAR(200) | | | 快照 |
| icon | VARCHAR(100) | ✓ | | |
| logo_url | VARCHAR(1024) | ✓ | | |
| viewed_at | DATETIME(3) | | | at（毫秒） |

主键：`(workspace_id, member_id, shelf_kind, asset_type, asset_id)`。
每人保留最近 N 条（沿用前端 MAX），写入时裁剪。无通用时间列。

### D4 `market_hidden_item` 用户隐藏的货架项

来源：`doc:market-hidden.byUserId[uid][]`，元素格式 `"<shelfKind>:<id>"`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一 |
| shelf_kind | VARCHAR(16) | | | 主键之一 |
| asset_id | VARCHAR(128) | | | 主键之一 |
| hidden_at | DATETIME(3) | | 当前时间 | |

主键：`(workspace_id, member_id, shelf_kind, asset_id)`。

### D5 `skill_review` Skill 评价

来源：`doc:skill-reviews.bySkillId[skillId][]`（SkillReviewItem）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键 |
| workspace_id | VARCHAR(64) | | | 外键 |
| skill_id | VARCHAR(128) | | | |
| member_id | VARCHAR(64) | | | userId |
| member_name | VARCHAR(120) | | | userName 快照 |
| rating | TINYINT UNSIGNED | | | 1–5 |
| content | TEXT | | | text |
| reply | TEXT | ✓ | | |
| created_at | DATETIME(3) | | | at（毫秒） |
| replied_at | DATETIME(3) | ✓ | | replyAt（毫秒） |
| updated_at | DATETIME(3) | | | |

主键：`id`；索引：`idx_review_skill (workspace_id, skill_id, created_at)`。
每个 Skill 最多保留 80 条（沿用前端 MAX_PER_SKILL）。

---

## E. 消息与资讯

### E1 `inbox_message` 站内信

来源：`InboxMessageRecord`（改名沿用）；另有旧 `doc:inbox.messages[]` 已无前端读取，按 id 去重后迁入。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| kind | VARCHAR(16) | | | `system` / `user` / `deliverable` / `ai_news` |
| title | VARCHAR(255) | | | |
| body | TEXT | | | |
| from_member_id | VARCHAR(64) | ✓ | | fromUserId |
| from_name | VARCHAR(120) | | | |
| to_member_id | VARCHAR(64) | | | toUserId；`*` 表示广播 |
| meta | JSON | ✓ | | `{chatId,warroomId,warroomTitle,artifactType,query,newsDate,...}` |
| created_at | DATETIME(3) | | 当前时间 | 无 updated_at |

主键：`(workspace_id, id)`；索引：`idx_inbox_to (workspace_id, to_member_id, created_at)`。

### E2 `inbox_message_state` 每人的已读 / 删除状态

来源：`InboxUserMessageState`（改名沿用）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一 |
| member_id | VARCHAR(64) | | | 主键之一；userId |
| message_id | VARCHAR(128) | | | 主键之一；外键 → inbox_message，级联删除 |
| read_at | DATETIME(3) | ✓ | | |
| deleted_at | DATETIME(3) | ✓ | | |
| updated_at | DATETIME(3) | | | |

主键：`(workspace_id, member_id, message_id)`；索引：`idx_inbox_state_member (workspace_id, member_id, deleted_at)`。

### E3 `station_announcement` 站内公告　＋通用时间列

来源：`doc:station-announcements.items[]`（StationAnnouncementRecord）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| title | VARCHAR(255) | | | |
| body | TEXT | | | |
| badge | VARCHAR(16) | | | `AI上线` / `AI培训` |
| published | TINYINT(1) | | 0 | 是否在首页跑马灯露出 |
| published_at | DATETIME(3) | | | |

主键：`(workspace_id, id)`。

### E4 `ai_news_post` 运营发布的 AI 新闻　＋通用时间列

来源：`doc:ai-news.items[]`（AiNewsRecord）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| id | VARCHAR(128) | | | 主键之一 |
| title | VARCHAR(255) | | | |
| summary | VARCHAR(500) | ✓ | | 跑马灯摘要 |
| body | MEDIUMTEXT | | | |
| cadence | VARCHAR(8) | | `'daily'` | `daily` / `weekly` |
| source | VARCHAR(255) | ✓ | | |
| published | TINYINT(1) | | 0 | |
| published_at | DATETIME(3) | | | |

主键：`(workspace_id, id)`。

### E5 `ai_news_feed_item` AIHOT 快讯（全局）　＋通用时间列

来源：`CenterRecord id=doc-ai-news-archive` 的 `items[]`（433 条，目前每次同步整包重写约 253KB）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `aihot-xxxx` |
| published_at | DATETIME(3) | | | |
| date_label | VARCHAR(32) | | `''` | 如 `9/17周四` |
| title | VARCHAR(500) | | | |
| summary | TEXT | | | |
| url | VARCHAR(2048) | | | |
| source | VARCHAR(120) | ✓ | | |
| category | VARCHAR(32) | ✓ | | |
| reason | TEXT | ✓ | | 推荐理由 |
| score | SMALLINT | ✓ | | |
| aihot_url | VARCHAR(512) | ✓ | | |

主键：`id`；索引：`idx_feed_published (published_at)`。
同步状态（updatedAt、lastSyncAt、lastSyncError、lastSyncVia）移到 `system_setting('ai-news-feed.sync')`。

### E6 `ai_brief_email_subscription` AI 快讯邮件订阅

来源：`AiBriefEmailSubscription`（改名沿用）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| member_id | VARCHAR(64) | | | 主键之一；userId |
| member_name | VARCHAR(120) | | | userName |
| email | VARCHAR(254) | | | 小写 |
| subscribed_at | DATETIME(3) | | 当前时间 | |
| updated_at | DATETIME(3) | | | |

主键：`(workspace_id, member_id)`；索引：`idx_sub_time (workspace_id, subscribed_at)`、`idx_sub_email (workspace_id, email)`。

---

## F. 执行与 AI

### F1 `execution` 执行记录

来源：`CenterRecord kind=execution`（ExecutionRecord）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `exec_<毫秒>_<hex>` |
| workspace_id | VARCHAR(64) | | | 外键 |
| member_id | VARCHAR(64) | ✓ | | 调用人 userId（现在只用于统计，不对外返回） |
| chat_id | VARCHAR(128) | | | |
| asset_type | VARCHAR(16) | | `'unknown'` | `tool` / `skill` / `agent` / `unknown` |
| asset_id | VARCHAR(200) | | | 兜底为 `chat:<chatId>` |
| agent_type | VARCHAR(16) | | | `marketing` / `knowledge` |
| agent_name | VARCHAR(200) | | | |
| status | VARCHAR(16) | | | `running` / `done` / `error` / `aborted` |
| source | VARCHAR(16) | ✓ | | `llm` / `scripted` |
| message | TEXT | | | 用户输入（截断到 2000 字） |
| error | TEXT | ✓ | | |
| total_time_label | VARCHAR(32) | ✓ | | totalTime 文案 |
| input_tokens | INT UNSIGNED | ✓ | | usage.inputTokens |
| output_tokens | INT UNSIGNED | ✓ | | usage.outputTokens |
| steps | JSON | ✓ | | `[{skill,time,label,detail}]` |
| started_at | DATETIME(3) | | | |
| finished_at | DATETIME(3) | ✓ | | |
| updated_at | DATETIME(3) | | | 列表按它倒序（沿用现有排序） |

主键：`id`；索引：`idx_exec_ws_updated (workspace_id, updated_at)`。

### F2 `ai_knowledge_draft` AI 智库需求草稿　＋通用时间列

来源：`CenterRecord kind=ai-knowledge-draft`（DemandDraft + ownerKey）。现在把工作区哈希和 owner 哈希编码进主键字符串，改为普通列加索引。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `draft-<uuid>` |
| workspace_id | VARCHAR(64) | | | 外键 |
| owner_key | VARCHAR(128) | | | `user:<memberId>` 或 `guest:<hash>` |
| owner_member_id | VARCHAR(64) | ✓ | | 登录用户冗余，便于按人查询 |
| scenario_id | VARCHAR(32) | | | `gtm-sellout` / `ecommerce-voc` / `mkt-campaign` / `generic` |
| original_question | TEXT | | | |
| demand | JSON | | | DemandSummary：`problem, goal, currentMethod, inputs, aiRole, humanCheckpoint, title, domain, pendingKeys` |
| messages | JSON | | `[]` | `[{id,role,text,createdAt}]` |
| clarification_count | TINYINT UNSIGNED | | 0 | |

索引：`idx_draft_owner (workspace_id, owner_key, updated_at)`。

### F3 `ai_knowledge_solution` AI 智库方案

来源：`CenterRecord kind=ai-knowledge-solution`（AiKnowledgeSolution + ownerKey）。生成后不再修改，只有 created_at。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | VARCHAR(64) | | | 主键，如 `solution-<uuid>` |
| workspace_id | VARCHAR(64) | | | 外键 |
| owner_key | VARCHAR(128) | | | |
| owner_member_id | VARCHAR(64) | ✓ | | |
| scenario_id | VARCHAR(32) | | | |
| title | VARCHAR(255) | | | |
| domain | VARCHAR(64) | | | |
| maturity | VARCHAR(16) | | | `已验证方案` / `有依据建议` / `探索性建议` |
| generation_source | VARCHAR(8) | | | `llm` / `rule` |
| model | VARCHAR(128) | ✓ | | |
| original_question | TEXT | | | |
| content | JSON | | | `demand, messages, target, actions, confirmations, evidence, diagnosis, toolRecommendations, caseInsights` |
| created_at | DATETIME(3) | | | |

索引：`idx_solution_owner (workspace_id, owner_key, created_at)`。

### F4 `llm_model_config` 模型配置　＋通用时间列

来源：`doc:llm-config.platformModels[]` 和 `customModels[]`。顶层 `model` / `defaultModelId` 移到 `workspace` 的两列；顶层 `baseUrl` / `apiKey` 是所选模型的快照，不单独存，读取时由所选模型行拼出。旧数据若顶层 Key 没有对应模型行，迁为一条 custom 模型。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| scope | VARCHAR(16) | | | 主键之一；`platform`（平台目录）/ `custom`（自定义扩展） |
| model_id | VARCHAR(128) | | | 主键之一；调用 API 时传的 model |
| source | VARCHAR(16) | ✓ | | `preset` / `platform`（仅平台目录） |
| label | VARCHAR(120) | | | |
| provider_name | VARCHAR(64) | ✓ | | |
| base_url | VARCHAR(1024) | | | OpenAI 兼容 Base URL |
| api_key | VARCHAR(1024) | ✓ | | 明文，或启用加密后的密文 `enc:v1:...`（见待确认问题） |
| enabled | TINYINT(1) | | 1 | |
| position | SMALLINT UNSIGNED | | 0 | 目录顺序 |

主键：`(workspace_id, scope, model_id)`。

---

## G. 配置

### G1 `workspace_setting` 工作区配置文档

不需要筛选、关联或按人隔离的纯配置，保留 JSON，但 revision 改成列。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一；外键 |
| setting_key | VARCHAR(48) | | | 主键之一；见下方键清单 |
| value | JSON | | | 文档内容（去掉 revision / expectedRevision） |
| schema_version | SMALLINT UNSIGNED | ✓ | | 文档内 version 字段 |
| revision | INT UNSIGNED | | 0 | 乐观锁 |
| updated_by_member_id | VARCHAR(64) | ✓ | | |
| updated_at | DATETIME(3) | | | 无 created_at |

主键：`(workspace_id, setting_key)`。

键清单（value 结构）：

| setting_key | 原文档 | value 结构 |
|---|---|---|
| `nav-presentation` | doc:nav-presentation | `{preset, roleEnabled: {角色: {路由: bool}}}` |
| `workspace-config` | doc:workspace-config | 工作区展示配置 |
| `external-taxonomy` | doc:external-taxonomy | `{version, types: [{id,label,csvLabel,icon,visible,filterTypeIds}]}` |
| `business-scenario-catalog` | doc:business-scenario-catalog | `{categories: [{id,label,fullLabel,icon,blurb,tabVisible}]}` |
| `org-taxonomy` | doc:org-taxonomy | 领域 / 区域组织树 |
| `external-tool-layout` | doc:external-tool-layout | `{version, all: {overseasFeaturedIds, domesticFeaturedIds, overseasMoreOrderIds, domesticMoreOrderIds}, categories: {类型id: 同结构}}` |
| `home-featured` | doc:home-featured | `{version, channels: {external: [工具id], internal: [工具id], projects: ["skill:<id>" 或 "agent:<id>"]}}` |
| `market-featured` | doc:market-featured | `{pins: {external, internal, projects}}`（旧精选，前端仍在读） |
| `plaza-howto` | doc:plaza-howto | `{records: [...]}` |
| `mss-build-stats` | doc:mss-build-stats | 建设成果文案 |
| `ai-brief-email-copy` | doc:ai-brief-email-copy | 快讯邮件文案 |
| `warroom-webhook` | doc:warroom-webhook | Webhook 配置（可能含令牌，读取权限需复核） |
| `security-policy` | doc:security-policy | 安全策略 |
| `demo-content` | doc:demo-content | `{demoContentOff}` |

说明：`external-tool-layout` 和 `home-featured` 是单管理员维护的有序列表，整份读写，也已有 revision 控制，拆行带来的好处不大，所以保留为配置文档；读取时继续过滤已不存在的工具。

### G2 `system_setting` 全局配置

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| setting_key | VARCHAR(64) | | | 主键 |
| value | JSON | | | |
| updated_at | DATETIME(3) | | | |

键清单：
- `tool-catalog.meta`：`{externalCatalogVersion, internalCatalogVersion, initialized, initializedAt, migratedAt}`（原 global-tools 单例的元数据）
- `ai-news-feed.sync`：`{updatedAt, lastSyncAt, lastSyncError, lastSyncVia}`（原快讯归档的同步状态）

---

## H. 统计事实

这 5 张表现在已经是关系型，主要改动：改名、事件表换自增主键、整理索引。均不加外键，无通用时间列。

### H1 `market_engagement_stat` 资产互动累计值

来源：`MarketEngagement`。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一 |
| content_id | VARCHAR(200) | | | 主键之一 |
| views | INT | | 0 | 有符号，避免异常减一时报溢出错误 |
| uses | INT | | 0 | |
| likes | INT | | 0 | |
| dislikes | INT | | 0 | |
| downloads | INT | | 0 | |
| favorites | INT | | 0 | 见 D1 说明 |
| updated_at | DATETIME(3) | | | |

主键：`(workspace_id, content_id)`。去掉现有的 `(workspace_id, updated_at)` 索引：没有查询按 updated_at 过滤，按工作区读取走主键前缀。

### H2 `market_engagement_event` 资产行为事实

来源：`MarketEngagementEvent`（2758 行）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | BIGINT UNSIGNED | | 自增 | 主键；原 UUID 主键不迁移 |
| workspace_id | VARCHAR(64) | | | |
| event_id | VARCHAR(128) | ✓ | | 请求幂等键；旧数据已回填为原 id |
| content_id | VARCHAR(200) | | | |
| asset_type | VARCHAR(16) | | `'unknown'` | `tool` / `skill` / `agent` / `office-scene` / `unknown` |
| action | VARCHAR(32) | | | `exposure` / `detail` / `view` / `use` / `redirect` / `download` / `favorite` / `favorite_cancel` / `like` / `like_cancel` / `dislike` / `dislike_cancel` / `call`，以及过渡值 `request:<action>` |
| date_key | CHAR(10) | | | 北京时间业务日 |
| visitor_hash | CHAR(64) | ✓ | | |
| visitor_type | VARCHAR(8) | | `'user'` | `user` / `guest` |
| success | TINYINT(1) | ✓ | | 调用是否成功（call） |
| duration_ms | INT UNSIGNED | ✓ | | |
| input_tokens | INT UNSIGNED | ✓ | | |
| output_tokens | INT UNSIGNED | ✓ | | |
| error_code | VARCHAR(200) | ✓ | | |
| occurred_at | DATETIME(3) | | | |

主键：`id`。
唯一：`uk_engagement_event (workspace_id, event_id)`。
索引（现有 8 个普通索引整理为 5 个，上线前用目标库 `EXPLAIN` 复核）：
- `idx_ee_date_action (workspace_id, date_key, action)`：看板各查询都按工作区 + 日期范围（+ 动作）过滤
- `idx_ee_ws_time (workspace_id, occurred_at)`：追踪起止时间 MIN / MAX
- `idx_ee_time (occurred_at)`：180 天保留期清理
- `idx_ee_date_visitor (workspace_id, date_key, visitor_hash)`：每日上限；采用 H6 计数表后可去掉
- `idx_ee_visitor_time (workspace_id, visitor_hash, occurred_at)`：每分钟上限；采用 H6 计数表后可去掉

去掉 `(workspace_id, content_id, occurred_at)`、`(workspace_id, content_id, action, date_key)`、`(workspace_id, asset_type, action, date_key)`：代码里没有按 content_id 或 asset_type 过滤的查询，这两列只出现在 SELECT / GROUP BY 中。

### H3 `portal_page_view` 门户页面访问

来源：`PortalPageView`（1547 行）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | BIGINT UNSIGNED | | 自增 | 主键（原主键为 workspaceId + eventId） |
| workspace_id | VARCHAR(64) | | | |
| event_id | VARCHAR(128) | | | |
| date_key | CHAR(10) | | | |
| route_key | VARCHAR(32) | | | `home` / `me` / `market-external` / `market-internal` / `market-projects` / `ai-brief` / `ai-tasks` / `market-tool` / `ai-map` / `task` / `messages` |
| visitor_hash | CHAR(64) | | | |
| visitor_type | VARCHAR(8) | | `'user'` | `user` / `guest` |
| journey_hash | CHAR(64) | ✓ | | 同一浏览器的访客与登录关联 |
| occurred_at | DATETIME(3) | | | |

唯一：`uk_page_view_event (workspace_id, event_id)`。
索引：
- `idx_pv_route (workspace_id, date_key, route_key)`：看板查询按工作区 + 日期范围 + 路由过滤
- `idx_pv_visitor (workspace_id, date_key, visitor_hash)`：每日上限；采用 H6 计数表后可去掉

去掉 `(workspace_id, date_key)`（是上面索引的前缀）、`(workspace_id, date_key, visitor_type)`、`(workspace_id, date_key, journey_hash)`（没有查询按这两列过滤页面访问表）。

### H4 `portal_daily_login` 每日登录用户

来源：`PortalDailyLogin`（20 行）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| workspace_id | VARCHAR(64) | | | 主键之一 |
| date_key | CHAR(10) | | | 主键之一 |
| visitor_hash | CHAR(64) | | | 主键之一 |
| first_login_at | DATETIME(3) | | | |

主键：`(workspace_id, date_key, visitor_hash)`。去掉单独的 `(workspace_id, date_key)` 索引（主键前缀已覆盖）。

### H5 `portal_conversion_event` 登录墙与转化事件

来源：`PortalConversionEvent`（74 行）。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | BIGINT UNSIGNED | | 自增 | 主键 |
| workspace_id | VARCHAR(64) | | | |
| event_id | VARCHAR(128) | | | |
| date_key | CHAR(10) | | | |
| event_type | VARCHAR(32) | | | `guest_gate_hit` / `login_success` |
| action | VARCHAR(32) | ✓ | | `like` / `dislike` / `favorite` / `download` / `submit-tool` / `submit-skill` / `submit-agent` / `chat` / `account` |
| route_key | VARCHAR(32) | ✓ | | |
| journey_hash | CHAR(64) | | | |
| user_hash | CHAR(64) | ✓ | | |
| occurred_at | DATETIME(3) | | | |

唯一：`uk_conversion_event (workspace_id, event_id)`。
索引：
- `idx_ce_type (workspace_id, date_key, event_type)`：登录墙漏斗按日期范围 + 事件类型过滤
- `idx_ce_journey (workspace_id, journey_hash, event_type, occurred_at)`：UV 归并子查询和转化 EXISTS 子查询按 journey + 类型 + 时间查找

去掉 `(workspace_id, date_key, journey_hash)`、`(workspace_id, date_key, action)`：前者的用途（登录墙每日上限）可由 `idx_ce_type` 或 H6 计数表替代；action 只用于 GROUP BY。

### H6 `analytics_quota` 限流计数（可选，推荐）

现在的限流是「同一条 SQL 里先 COUNT，未超上限再 INSERT」，靠 SQLite 同一时间只有一个写入者保证正确。InnoDB 在 REPEATABLE-READ 下会给 COUNT 扫描的范围加共享间隙锁，同一访客的并发请求会互相死锁；在 READ-COMMITTED 下则不加锁，上限可能被并发请求突破。改用计数表，一条语句原子地「未超上限才加一」：

```sql
INSERT INTO analytics_quota (scope, workspace_id, bucket, subject_hash, used, updated_at)
VALUES (?, ?, ?, ?, 1, NOW(3))
ON DUPLICATE KEY UPDATE
  used = IF(used < ?, used + 1, used),
  updated_at = NOW(3);
-- 影响行数：1 = 新建，2 = 已加一，0 = 已达上限
```

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| scope | VARCHAR(32) | | | 主键之一；`page_view_day` / `gate_hit_day` / `market_event_day` / `market_event_minute` |
| workspace_id | VARCHAR(64) | | | 主键之一 |
| bucket | VARCHAR(16) | | | 主键之一；业务日 `2026-09-17` 或分钟 `202609171230` |
| subject_hash | CHAR(64) | | | 主键之一；visitor_hash 或 journey_hash |
| used | INT UNSIGNED | | 0 | |
| updated_at | DATETIME(3) | | | |

主键：`(scope, workspace_id, bucket, subject_hash)`；索引：`idx_quota_updated (updated_at)`（定时清理过期桶）。
代价：每分钟上限从滑动窗口变为按自然分钟计数。

---

## I. 文件元数据（可选）

### I1 `blob_object`

来源：`data/blobs/<workspace>/<id>.json` 元数据文件（文件本体仍放 BLOB_ROOT 或对象存储）。有了这张表，skill / agent / 审批单的 `package_blob_id` 才能校验引用、清理孤儿文件。

| 字段 | 类型 | 空 | 默认 | 说明（来源） |
|---|---|---|---|---|
| id | CHAR(32) | | | 主键 |
| workspace_id | VARCHAR(64) | | | 外键 |
| name | VARCHAR(255) | | | |
| mime_type | VARCHAR(127) | | | |
| size_bytes | BIGINT UNSIGNED | | | |
| sha256 | CHAR(64) | | | |
| purpose | VARCHAR(16) | | `'attachment'` | `attachment` / `package` |
| delete_capability_hash | CHAR(64) | ✓ | | 删除令牌的哈希 |
| storage_key | VARCHAR(512) | | | 相对 BLOB_ROOT 的路径 |
| created_at | DATETIME(3) | | | 无 updated_at |

索引：`idx_blob_ws (workspace_id, created_at)`（按工作区清理孤儿文件）。

---

## J. 不再迁移的旧数据

| 旧数据 | 处理 | 原因 |
|---|---|---|
| `CenterRecord kind=agent/skill/tool` 投影 | 不迁移 | marketplace 与全局工具目录才是权威源；投影主键缺工作区维度，已出现串写（`agent-marketing` 归属被 `ws-3c-latam` 占用） |
| 各工作区 `marketplace.tools` | 不迁移 | 已被全局工具目录取代；仅在 `external-tool-layout` 缺失时作为种子输入 |
| `Workspace.catalogJson.workspace` / `defaultChatId` | 不迁移 | 与 workspace 表的列重复 |
| `doc:inbox` | 并入 inbox_message 后丢弃 | 前端已不读取 |
| `doc:ai-news-prefs` | 丢弃 | 前端已不读取；订阅已由迁移 20260820213000 转入订阅表 |
| `doc:content-engagement` | 若未标记 normalizedAt，先按现有逻辑并入累计表，然后丢弃 | 已是只读旧文档 |
| `CenterRecord kind=case/ai-case` | 删除读取代码 | 只有读取没有写入，库中 0 行；案例来自 `AI_CASE_LIBRARY_DATA_PATH` |
| `doc:auth-sessions` 里已过期的会话 | 丢弃 | |
| 工作区 `local`、`global`、`__global__` | `global` / `__global__` 的内容分别并入 E5、B1；`local` 待确认 | `local` 疑似开发残留 |

---

## K. 迁移时的数据转换规则

1. **时间**：SQLite 里 Prisma 存的毫秒整数 → `DATETIME(3)` UTC；JSON 里的毫秒数和 ISO 字符串 → `DATETIME(3)` UTC；`YYYY-MM-DD` → 北京时间当日 00:00 转 UTC，读取时按原格式输出。
2. **邮箱**：统一归一化后合并账号。凭证冲突按 A3 规则处理并输出清单。
3. **会话令牌**：只迁未过期的，存 SHA-256。
4. **字符串长度**：迁移前按本文字段长度校验，超长记录列入报告，不静默截断（云库 `sql_mode` 通常含 `STRICT_TRANS_TABLES`，超长会直接报错）。
5. **data URL**：头像、Logo、预览附件里的 data URL，按待确认问题的结论决定是转存文件还是原样写入 MEDIUMTEXT。
6. **校验**：逐表核对行数；切换前后对所有 GET 接口（docs 各 kind、marketplace、tools、market-engagement、portal-analytics 报表、inbox、executions 等）的响应做 JSON 对比。

---

## L. MySQL 兼容云数据库的注意事项

- 本地开发用 docker MySQL 8.0 跑 `prisma migrate dev`（需要 shadow database，云库账号通常没有建库权限）；云库只执行 `prisma migrate deploy`。
- 现有 14 个 SQLite 迁移不能在 MySQL 上执行，需要重新生成一个 MySQL 初始迁移。
- 确认实例默认隔离级别（REPEATABLE-READ 或 READ-COMMITTED）；H6 的计数表写法在两种隔离级别下都正确。
- `DATABASE_URL` 设置 `connection_limit`、`pool_timeout`；连接时区固定 UTC。
- 所有 raw SQL 需要重写：约 25 处使用双引号引用表名 / 列名（MySQL 默认把双引号当字符串），6 处 `INSERT OR IGNORE`，4 处 JSON 路径 CAS（`json_type` / `json_extract`）。
- 需要在目标云库上实测：`JSON` 列与 `JSON_TABLE`（用于数据回填）、`INSERT ... ON DUPLICATE KEY UPDATE` 的影响行数语义、`DATETIME(3)`、Prisma 内省与迁移。

---

## M. 待确认问题

1. **迁移路径**：两步走（先原样迁到 MySQL 并切换，再逐块规范化）/ 一次到位 / 只换库。
2. **聊天会话接口没有登录校验**：`GET/PUT /workspaces/:id/sessions` 目前任何能访问站点的人都能读取整个工作区所有人的对话记录，也能整包覆盖。改表时是否一并改为必须登录、只读写本人会话？
3. **收藏**：以 `market_favorite` 为唯一来源、收藏数从它统计，是否同意？
4. **审计日志**：改为只追加后，保留多久（例如 180 天）？
5. **模型 API Key**：是否加密存储？需要新增一个部署环境变量作为加密密钥，密钥丢失则 Key 无法解密。
6. **data URL 图片**（Agent 头像、Skill 图标、工具 Logo、案例预览附件）：迁移时转存为文件，还是暂时原样写入 MEDIUMTEXT？
7. **`local` 工作区**：是否为开发残留，可以不迁移？
