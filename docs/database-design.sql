-- ============================================================================
-- MSS Claw 目标库表结构 · PostgreSQL 17 · 单租户
-- 版本：v0.4（2026-10-19）
-- 来源：docs/database-mysql-design.md v0.1（MySQL 草案）改为 PG、去掉租户，并按 2026-10-19 的代码和存量数据校正
--
-- 本文件描述六期全部完成后的最终结构，用于审查表结构本身。
-- 实际建表由 Prisma 迁移生成：schema.prisma 用 @@map / @map 映射到这里的下划线命名，代码里的模型名、字段名不变。
-- 本文件可在空库直接执行（psql -v ON_ERROR_STOP=1 -f）检查语法和约束。
--
-- 单租户
--   平台只有一个空间，库里不再有工作区表和 workspace_id 列，接口路径和前端也不再带工作区（第 1 期完成）。
--   现有数据都属于原 ws-cn-marketing 空间；第 2 期换库前，后端读写旧表时把它当作固定值。
--   统计里的 visitor_hash = sha256("mss-claw:portal-uv:v1:" + 工作区 id + ":account:" + 成员 id)：工作区 id 固定写 ws-cn-marketing，历史 UV 不断档。
--   数据迁移规则（2026-10-20 确认）：文档与个人数据只迁 ws-cn-marketing 和全局数据，其他工作区不迁，原 SQLite 文件留作备份；
--     统计（行为事件、页面访问、每日登录、转化事件）各工作区合并，互动累计值按内容求和。
--     迁移脚本 apps/api/scripts/migrate-sqlite-to-pg.mjs 先只读输出各工作区数据量，确认后加 --apply 执行。
--     只在其他工作区出现的成员不补进来（第 4 期确认），他们走统一身份登录时按自动建号规则以 business_user 新建。
--
-- 分期（每期单独上线可用）
--   第 1 期  去租户（代码层，库仍是 SQLite、表不动）：接口路径去掉 /workspaces/:workspaceId，前端去掉工作区和切换，
--            删除其他工作区的种子目录；文件存储对象键改为不分工作区，已存的 /api/v1/workspaces/<ws>/blobs/<id> 地址改写为
--            /api/v1/blobs/<id>，旧地址永久 301 跳转。
--   第 2 期  换 PG：现有 12 张表按本文件迁过去（去掉 workspace_id），Workspace 表的内容存入 app_setting('workspace')，
--            其余 JSON 文档仍在过渡表 center_record，接口不变（2026-10-20 完成）。
--   第 3 期  资产：tool / skill / skill_version / agent / agent_skill / automation / kb_document（2026-10-21 完成）。
--            接口仍是整份快照收发（GET/PUT /marketplace、/tools），后端拆成逐行写入；快照里出现没有列的字段直接拒绝保存。
--            迁移脚本 apps/api/scripts/migrate-assets-to-tables.mjs 写完资产表后删除 global-tools、marketplace 行和 agent/skill/tool 投影行。
--   第 4 期  身份：member / member_credential / auth_session（2026-10-21 完成）。
--            接口不变（/docs/members、/docs/auth-credentials 整份收发，版本号改用 collection_revision）；
--            迁移脚本 apps/api/scripts/migrate-identity-to-tables.mjs。密码挂在成员上，前端改为先保存成员再设密码。
--   第 5 期  个人数据：market_favorite / market_user_vote / market_recent_view / market_hidden_item / skill_review
--   第 6 期  其余：配置、审批、审计、门户内容、办公场景、对话、消息、资讯、执行、AI 智库、模型配置；之后删除 center_record
--
-- 字段核对范围：第 2 期的表按现有 schema.prisma 逐列转换；第 3 期的资产表已对照 TS 类型和存量数据逐字段核对；
--               第 4–6 期的表沿用草案字段，进入该期时再对照代码和存量数据逐字段核对一次。
--
-- 通用约定
--   1. 表名、列名小写下划线。
--   2. 字符串一律 text，长度由应用层（zod）校验；id、哈希也用 text（由应用生成，含 uuid）。
--   3. 时间 timestamptz(3)，存 UTC。业务日 date_key 为北京时间 'YYYY-MM-DD' 文本。
--      资产 JSON 里前端写入的 createdAt / updatedAt 字符串存为 source_created_at / source_updated_at 文本，原样返回。
--   4. 结构化展示字段用 jsonb；需要筛选、排序、关联或唯一约束的字段一律独立成列。
--   5. 取值固定的字段（状态、类型）用 text + 应用层校验，不用 PG 枚举；可选值写在注释里。
--   6. 接口返回不变：TS 类型里的可选字段对应可空列、不设默认值，空值读出时不输出该字段；必填字段为 not null。
--      迁移不得给原来缺省的字段补默认值，否则会改变前端的回退推断（如 marketShelf 缺省时按标签推断货架）。
--   7. 外键只用在「父行删除时子行必须一起删除」的地方（Skill 版本、Agent 编排、站内信状态、凭证、会话）；
--      个人数据、统计、审计按字符串 id 关联，不加外键，删除资产或成员后保留历史。PG 不会自动给外键列建索引，按查询需要显式建。
--   8. 工具 / Skill / Agent 用自增 no 作主键，供分享链接等对外引用；字符串 id 保留为唯一键，
--      收藏、统计、审批、精选布局等关联一律继续用字符串 id，历史数据不受影响。
--   9. 乐观锁：单行对象用本行 version / revision；整表替换的集合用 collection_revision。
--  10. 图片、附件、能力包存 MinIO，库里只存 blob 地址（/api/v1/blobs/<id>）或包引用 JSON；SVG 图片仍可能是 data URL。
--
-- 相比 MySQL 草案 v0.1 的改动
--   * 去掉租户：删除 workspace 表和所有 workspace_id；account 与 workspace_member 合并为 member；
--     workspace_setting 与 system_setting 合并为 app_setting，工作区名称、演示口令开关、所选模型等也存进去。
--   * MySQL 约定 → PG 约定；工具 / Skill / Agent 加自增 no 主键；图片走 MinIO，删除可选表 blob_object。
--   * 删除可选表 analytics_quota：它解决的是 InnoDB 间隙锁死锁；PG 下「先计数再插入」并发时最多多记几条，对统计无影响。
--   * 统计事实表保留现有主键形式（事件 uuid、页面访问按 event_id）：PG 不按主键聚簇存储，随机 uuid 不影响写入。
--   * 新增 case_insight_article（草案之后才有的表）。
--   * 按存量数据校正，避免迁移丢数据：skill.name 与 name_zh 分开存（本地 21 条不相同）；skill 补 homepage_url、description_zh；
--     featured_in_do_task 与 featured_in_mss_market 分开存；automation 补 icon、published，kb_document 补 content、published
--     （存量数据有，类型里没有）；tool 补 owner_region_ids；Skill / Agent 的包引用整体存 jsonb；可选字段一律可空不设默认。
--   * 身份域按 OAuth 登录现状补字段：member.external_id（IDaaS 稳定标识，优先于邮箱匹配）、post_name、org_path；
--     auth_method 增加 oauth；email 可空（只有 external_id 的成员）。
--   * 成员相关列统一叫 member_id（现有表里的 userId 字段也映射到 member_id 列）。
-- ============================================================================


-- ============================================================================
-- A. 成员与身份
-- ============================================================================

-- A1 成员【第 4 期】来源：ws-cn-marketing 的 doc:members.members[]（其他工作区独有的成员不迁）；
--   同一人先按 external_id、再按归一化邮箱识别。整表 PUT 用 collection_revision('members') 做并发控制。
--   接口里的 lastActive 由 last_login_at 生成（旧的「刚刚 / 今天」文案不迁）；external_id / post_name / org_path
--   只由统一身份登录回写，管理员保存成员表时沿用库里的值。从成员表删掉的人连同密码、会话一起删除。
create table member (
  id            text primary key,                               -- 沿用旧成员 id（如 u-mcyo）：收藏、统计 visitor_hash 都引用它；新成员由应用生成
  email         text unique,                                    -- 归一化：去空格、小写、@company.com → @huawei.com；与 external_id 至少有一个
  external_id   text unique,                                    -- OAuth（IDaaS）稳定用户标识；账号或邮箱变更后仍能认出同一人
  display_name  text not null,
  avatar        text not null default 'bg-zinc-600',            -- 头像色块 class
  post_name     text,                                           -- OAuth 登录回写的岗位
  org_path      text,                                           -- OAuth 登录回写的组织路径
  role          text not null default 'business_user',          -- super_admin / capability_ops / business_user / viewer
  status        text not null default 'active',                 -- active / invited / suspended
  dept_ids      jsonb not null default '[]',                    -- 机关职能（领域）归属
  region_id     text,                                           -- 一线区域
  position      integer not null default 0,                     -- 成员表顺序（整表 PUT 保序）
  last_login_at timestamptz(3),                                 -- 取代成员表里「刚刚」这类文案
  created_at    timestamptz(3) not null default now(),
  updated_at    timestamptz(3) not null
);

-- A2 成员密码【第 4 期】来源：doc:auth-credentials.credentials[email]；找不到成员的旧密码迁移时丢弃，
--   接口写入时同样跳过（所以前端批量导入、邀请并激活都改成先保存成员、确认成功后再设密码）。
create table member_credential (
  member_id           text primary key references member (id) on delete cascade,
  algorithm           text not null default 'sha256-salt',      -- 现为 sha256(salt + ":" + password)；预留 scrypt / argon2id，登录成功时平滑升级
  salt                text not null,
  password_hash       text not null,
  password_updated_at timestamptz(3) not null,
  created_at          timestamptz(3) not null default now(),
  updated_at          timestamptz(3) not null
);

-- A3 登录会话【第 4 期】来源：doc:auth-sessions.sessions[token]；只迁未过期会话，已登录用户不用重新登录
create table auth_session (
  token_hash   text primary key,                                -- SHA-256(令牌)；库里不存明文令牌
  member_id    text not null references member (id) on delete cascade,
  auth_method  text not null,                                   -- password / demo / oauth；app_setting('auth-policy') 不允许演示口令时拒绝 demo 会话
  expires_at   timestamptz(3) not null,
  last_seen_at timestamptz(3),                                  -- 预留；每次请求都写太频繁，暂不维护
  created_at   timestamptz(3) not null default now()
);
create index auth_session_member_idx on auth_session (member_id);
create index auth_session_expires_idx on auth_session (expires_at);   -- 定时清理过期会话

-- A4 对话 / 任务会话【第 6 期】来源：app_setting('workspace') 里 catalog 的 chats[chatId]（原 Workspace.catalogJson.chats）
--   待定（草案问题 2）：现有会话接口没有登录校验，改表时是否改为必须登录、只读写本人会话。
create table chat_session (
  id                   text primary key,
  owner_member_id      text,                                    -- 空表示协作空间（WarRoom）或历史共享会话
  owner_email          text,                                    -- 兼容字段
  type                 text not null,                           -- bot / group
  session_group        text,                                    -- pinned / agents
  title                text not null,
  status               text not null default '',
  icon                 text not null default '',
  icon_bg              text,
  color                text not null default '',
  badge                text,
  agent_id             text,
  skill_id             text,
  action_type          text,                                    -- marketing / knowledge
  task_source          text,                                    -- skill / expert / case_demo / embedded / other
  business_scenario_id text,                                    -- S1–S8
  admin_member_id      text,                                    -- WarRoom 管理员
  members              jsonb,                                   -- WarRoom 成员 [{id,name,email,avatar,role,canUseAi}]
  prompts              jsonb not null default '[]',             -- 推荐提问
  history              jsonb not null default '[]',             -- 消息数组；单会话消息量变大后再拆 chat_message 表
  pinned_at            timestamptz(3),
  created_at           timestamptz(3) not null default now(),
  updated_at           timestamptz(3) not null
);
create index chat_session_owner_idx on chat_session (owner_member_id, updated_at);


-- ============================================================================
-- B. 资产目录
-- ============================================================================

-- B1 工具【第 3 期】来源：center_record id=global-tools 的 tools[]（77 条）
--   各工作区 marketplace.tools（每个约 164 条的过时副本）和 kind=tool 投影行不迁移。
--   B1、B2、B4、B6、B7 都有 position：快照数组顺序。前端新增资产插在数组最前，顺序就是默认展示顺序，整份 PUT 必须保序。
create table tool (
  no                      bigserial primary key,                -- 对外编号（分享链接用）
  id                      text not null unique,                 -- 字符串 id，收藏 / 统计 / 精选布局 / 办公场景等都用它关联
  position                integer not null,                     -- 快照数组顺序
  name                    text not null,
  market_title            text,                                 -- 外精选卡主标题
  description             text not null,                        -- desc
  card_summary            text,                                 -- 卡片核心作用
  category                text not null,                        -- connector / external / platform
  source_type             text,                                 -- internal / external
  market_shelf            text,                                 -- external 外部工具精选 / internal 内部办公推荐 / none 仅配置目录；空时按 sourceType + 标签推断
  region                  text,                                 -- overseas / domestic（外部工具）
  company                 text,                                 -- 厂商
  author                  text not null,
  publisher_name          text,                                 -- publisher
  publisher_member_id     text,                                 -- publisherUserId
  published               boolean not null,                     -- 是否上架
  visibility              text,                                 -- public / org / private
  owner_dept_ids          jsonb,
  owner_region_id         text,
  owner_region_ids        jsonb,                                -- 历史多区域字段
  icon                    text not null,                        -- Font Awesome class
  logo_url                text,                                 -- MinIO 图片地址、外链或 SVG data URL
  homepage_url            text,
  docs_url                text,
  media_url               text,
  screenshot_url          text,
  version_label           text,
  delivery_form           text,                                 -- web / download_only
  connector_type          text,                                 -- 内部连接器类型
  tool_type_id            text,                                 -- 主工具类型
  tool_type_ids           jsonb,                                -- 所属工具类型列表
  tool_type_labels        jsonb,                                -- 工具类型展示名
  external_category_ranks jsonb,                                -- {类型id: 排序值}
  external_sort_order     integer,                              -- 「全部」视图顺序
  external_sort_rank      integer,                              -- 最优排序
  best_for                text,                                 -- 最适合场景
  product_intro           text,                                 -- 产品详细介绍
  core_capabilities       jsonb,                                -- 核心能力标签
  usage_guide             jsonb,                                -- 站内使用指导步骤
  tags                    jsonb not null,
  scenario_tags           jsonb,
  business_scenario_ids   jsonb,                                -- S1–S8
  invokes                 integer not null default 0,           -- 调用次数展示值；目前仍随整份快照写入，改成「加 1」接口原子更新需前端配合，后续再做
  featured_in_find_cases  boolean,                              -- 旧精选字段，只读兼容
  created_at              timestamptz(3) not null default now(),
  updated_at              timestamptz(3) not null
);

-- B2 Skill【第 3 期】来源：ws-cn-marketing 的 marketplace.skills[]；kind=skill 投影行不迁移
create table skill (
  no                     bigserial primary key,                 -- 对外编号
  id                     text not null unique,
  position               integer not null,                      -- 快照数组顺序
  name                   text not null,                         -- 主展示名（兼容旧数据）
  name_zh                text,                                  -- 与 name 不一定相同（本地 21 条不同），分开存
  name_en                text,
  description            text not null,                         -- desc
  description_zh         text,                                  -- descZh
  description_en         text,                                  -- descEn
  category               text not null,                         -- office / manage / process / experience
  command                text not null,                         -- 如 /mss-translate
  author                 text not null,
  publisher_name         text,
  publisher_member_id    text,
  version                text not null,                         -- 当前版本
  connector              text not null,
  published              boolean not null,                      -- 发布（终审通过后前台展示）
  callable               boolean,                               -- 上架可调用；空表示按 published 兼容
  featured_in_do_task    boolean,                               -- 旧精选字段，featured_in_mss_market 为空时回退
  featured_in_mss_market boolean,                               -- Skill Hub 精选
  business_scenario_id   text,                                  -- S1–S8
  source_type            text,                                  -- internal / external
  visibility             text,                                  -- public / org / private
  owner_dept_ids         jsonb,
  owner_region_id        text,
  owner_region_ids       jsonb,                                 -- 历史多区域字段
  homepage_url           text,
  scenario_tags          jsonb,
  invokes                integer not null default 0,
  icon                   text not null,
  icon_url               text,                                  -- 自定义头像：MinIO 图片地址或 SVG data URL
  accent_color           text,
  tags                   jsonb not null,
  search_keywords        jsonb,
  instructions           text,                                  -- Skill 正文（执行时注入）
  plan_steps             jsonb,                                 -- 默认执行计划
  usage_notes            text,                                  -- 使用须知
  package_blob           jsonb,                                 -- 当前 Skill 包引用 UploadedPackageRef {id,name,size,url,...}
  detail                 jsonb,                                 -- 展示型详情：cases、caseAttachments、envInfo、securityScan
  trace_evaluation       jsonb,                                 -- TRACE 五维评测报告
  updated_by             text,
  source_created_at      text,                                  -- 资产自带 createdAt 字符串，原样返回
  source_updated_at      text,
  created_at             timestamptz(3) not null default now(),
  updated_at             timestamptz(3) not null
);

-- B3 Skill 版本【第 3 期】来源：skill.versions[]（保持原数组顺序）；同一 Skill 出现重复版本号时迁移脚本停止并报告
create table skill_version (
  skill_no     bigint not null references skill (no) on delete cascade,
  version      text not null,
  position     integer not null,                                -- 原数组顺序
  notes        text,
  status       text,                                            -- active / retired
  package_blob jsonb,                                           -- 该版本自己的包引用，历史版本各自可下载
  published_at text,                                            -- 原样字符串
  primary key (skill_no, version)
);

-- B4 Agent【第 3 期】来源：ws-cn-marketing 的 marketplace.agents[]；kind=agent 投影行不迁移
create table agent (
  no                    bigserial primary key,                  -- 对外编号
  id                    text not null unique,
  position              integer not null,                       -- 快照数组顺序
  name                  text not null,
  description           text not null,                          -- desc
  value_proposition     text,                                   -- 一句话价值
  category              text not null,                          -- office / manage / process / experience
  biz_line              text not null,
  home_tag              text not null,                          -- 首页分类（兼容 DeptId）
  author                text not null,
  publisher_name        text,
  publisher_member_id   text,
  maintainer            text,
  published             boolean not null,
  featured_in_do_task   boolean,                                -- 做任务 · 场景专家精选
  lifecycle_status      text,                                   -- 可运行 / 建设中
  business_scenario_id  text,                                   -- S1–S8
  source_type           text,
  visibility            text,
  owner_dept_ids        jsonb,                                  -- 缺省回退 home_tag，所以不设默认值
  owner_region_ids      jsonb,
  scenario_tags         jsonb,
  capability_type_ids   jsonb,
  invokes               integer not null default 0,
  primary_skill_id      text,                                   -- 调用时优先挂载的主 Skill
  chat_id               text not null,
  icon                  text not null,
  color                 text not null,
  avatar_preset_id      text,
  avatar_url            text,                                   -- 自定义头像：MinIO 图片地址或 SVG data URL
  system_prompt         text,
  demo_prompt           text,
  demo_url              text,
  solution_doc_url      text,
  feedback_url          text,
  install_command       text,
  version               text,
  version_summary       text,
  requires_human_review boolean,
  package_blob          jsonb,                                  -- 执行包引用
  plan_steps            jsonb,
  detail                jsonb,                                  -- 展示型详情：capabilities、targetUsers、capabilityBoundaries、suitableFor、
                                                                --   notSuitableFor、inputOutput、quickStart、cases、caseAttachments、environment
  source_created_at     text,                                   -- 资产自带 createdAt / updatedAt 字符串，原样返回
  source_updated_at     text,
  created_at            timestamptz(3) not null default now(),
  updated_at            timestamptz(3) not null
);

-- B5 Agent 编排的 Skill【第 3 期】来源：agent.skillIds[]（保持顺序，重复项去重保留首次出现）
--   skill_id 不加外键：编排里可能引用尚未上架或已删除的 Skill；删除 Skill 时在同一事务里删掉引用行，取代现在 putMarketplace 里的手动清理。
create table agent_skill (
  agent_no bigint not null references agent (no) on delete cascade,
  skill_id text not null,
  position integer not null,
  primary key (agent_no, skill_id)
);
create index agent_skill_skill_idx on agent_skill (skill_id);

-- B6 自动化【第 3 期】来源：ws-cn-marketing 的 marketplace.automations[]
create table automation (
  id          text primary key,
  position    integer not null,                                 -- 快照数组顺序
  name        text not null,
  description text not null,                                    -- desc
  agent_id    text not null,
  skill_ids   jsonb not null,
  schedule    text not null,                                    -- 调度描述文案
  enabled     boolean not null,
  last_run    text not null,                                    -- 文案，如「2 小时前」
  icon        text,                                             -- 存量数据有、类型里没有
  published   boolean,                                          -- 同上
  created_at  timestamptz(3) not null default now(),
  updated_at  timestamptz(3) not null
);

-- B7 知识库文档【第 3 期】来源：ws-cn-marketing 的 marketplace.kbDocs[]
create table kb_document (
  id                text primary key,
  position          integer not null,                           -- 快照数组顺序
  title             text not null,
  description       text not null,                              -- desc
  collection_id     text not null,                              -- collection
  doc_type          text not null,                              -- type
  size_label        text not null,                              -- size，如 2.3MB
  pages             integer not null,
  clearance         text not null,                              -- 密级
  indexed           boolean not null,
  chunks            integer not null,
  author            text not null,
  tags              jsonb not null,
  chunk_texts       jsonb,
  content           text,                                       -- 存量数据有、类型里没有
  published         boolean,                                    -- 同上
  source_updated_at text not null,                              -- 文档自带 updatedAt 字符串
  created_at        timestamptz(3) not null default now(),
  updated_at        timestamptz(3) not null
);

-- B8 内部办公场景【第 6 期】来源：doc:internal-office-scenes.entries[]；统计里的 contentId 为 office-scene-<id>
--   整表替换并发控制：collection_revision('office-scenes')
create table office_scene (
  id          text primary key,                                 -- ^[a-z0-9][a-z0-9-]{0,47}$
  label       text not null,
  english     text not null default '',
  description text not null,                                    -- 最长 4000 字
  icon        text not null default 'fa-cube',
  visible     boolean not null default true,                    -- 是否上架展示
  position    integer not null default 0,
  tool_id     text,                                             -- 绑定工具的字符串 id（现有校验最多 1 个）
  tool_blurb  text,                                             -- 该工具在场景下的说明
  created_at  timestamptz(3) not null default now(),
  updated_at  timestamptz(3) not null
);

-- B9 原型中心资源【第 6 期】来源：center_record kind in (prompt, workflow, knowledge, memory)；数据少、嵌套深，整体存 jsonb
create table center_resource (
  kind       text not null,                                     -- prompt / workflow / knowledge / memory
  id         text not null,
  name       text,                                              -- 冗余展示名
  status     text,                                              -- lifecycle / status / pipelineStage
  payload    jsonb not null,
  created_at timestamptz(3) not null default now(),
  updated_at timestamptz(3) not null,
  primary key (kind, id)
);


-- ============================================================================
-- C. 运营与治理
-- ============================================================================

-- C1 门户知识地图内容【第 6 期】来源：center_record kind=portal-content 的 items[]
--   整表替换并发控制：collection_revision('portal-content')
create table portal_content (
  id                  text primary key,
  type                text not null,                            -- case / playbook / insight / training / news
  title               text not null,
  description         text not null,
  icon                text not null default '',
  published           boolean not null default true,
  is_gold             boolean not null default false,           -- 金案例
  source_type         text,
  visibility          text not null default 'public',
  publisher_name      text,
  publisher_member_id text,
  owner_dept_ids      jsonb not null default '[]',
  owner_region_id     text,
  scenario_tags       jsonb not null default '[]',
  homepage_url        text,
  kb_doc_id           text,                                     -- 关联资产（字符串 id）
  agent_id            text,
  skill_id            text,
  primary_skill_id    text,
  tool_id             text,
  pain_point          text,
  impact_metric       text,
  steps               jsonb not null default '[]',              -- 打样三步走
  package_version     text,
  preview_file        jsonb,                                    -- {name,mimeType,size,url,blobId,kind}；不存 dataUrl
  layout_preview_file jsonb,
  position            integer not null default 0,               -- 列表顺序
  published_at        timestamptz(3) not null,
  created_at          timestamptz(3) not null default now(),
  updated_at          timestamptz(3) not null
);

-- C2 资产审批单【第 6 期】来源：doc:asset-approvals.items[]
create table asset_approval (
  id                   text primary key,                        -- 如 apr_<毫秒>_<随机>
  asset_kind           text not null,                           -- agent / skill / tool / kb / automation / portal
  asset_id             text not null,                           -- 资产字符串 id
  asset_name           text not null,
  submitter_member_id  text,
  submitter_name       text not null,
  step_index           smallint not null default 0,             -- 0 提交人完成 / 1 待业务主管 / 2 待质量运营 / 3 全部通过
  status               text not null default 'pending',         -- pending / approved / cancelled / rejected
  reasons              jsonb not null default '[]',             -- publish_executable / visibility_public / update_version / unpublish_skill
  note                 text,                                    -- 更新说明 / 下架理由
  reject_note          text,
  target_version       text,
  package_blob         jsonb,                                   -- 更新申请上传的包引用
  unpublish_mode       text,                                    -- all / versions
  unpublish_versions   jsonb,
  decided_at           timestamptz(3),
  decided_by_member_id text,
  created_at           timestamptz(3) not null default now(),
  updated_at           timestamptz(3) not null
);
create index asset_approval_asset_idx on asset_approval (asset_kind, asset_id, status);   -- 删除 Skill 前检查待审批

-- C3 审批关注【第 6 期】来源：doc:asset-approvals.watchedByUserId[uid][]
create table asset_approval_watch (
  member_id  text not null,
  asset_kind text not null,
  asset_id   text not null,
  asset_name text not null,                                     -- 快照
  created_at timestamptz(3) not null default now(),
  primary key (member_id, asset_kind, asset_id)
);

-- C4 审计日志（只追加）【第 6 期】来源：doc:audit-log.logs[]
--   兼容整份 PUT：只插入新条目，不按提交列表删除旧条目；GET 返回最近 N 条。待定（草案问题 4）：保留多久。
create table audit_log (
  id              bigserial primary key,
  entry_id        text not null unique,                         -- 客户端生成，用于幂等
  occurred_at     timestamptz(3) not null,
  category        text not null,                                -- auth / browse / task / model / members / org / rbac / asset
  action          text not null,                                -- 如 login、task.execute
  module          text not null,
  detail          text not null,
  actor_member_id text,
  actor_name      text not null,
  actor_email     text,
  actor_role      text,
  dept_ids        jsonb not null default '[]',                  -- 操作时的领域归属
  region_id       text,                                         -- 操作时的区域归属
  created_at      timestamptz(3) not null default now()
);
create index audit_log_time_idx on audit_log (occurred_at);    -- 取最近 N 条、按时间清理

-- C5 整表替换的版本号【第 4 期起用】
--   同一事务里先 update ... set revision = revision + 1 where collection = $1 and revision = $2，影响 0 行即返回 409，否则再写明细行。
create table collection_revision (
  collection           text primary key,                        -- members / office-scenes / portal-content / auth-credentials
  revision             integer not null default 0,
  updated_by_member_id text,
  updated_at           timestamptz(3) not null
);


-- ============================================================================
-- D. 个人数据与互动（按字符串 id 关联成员和资产，不加外键）
-- ============================================================================

-- D1 收藏（唯一来源）【第 5 期】来源：doc:market-favorites.byUserId[uid][] 与 market_user_interaction.favorited
--   现状是前端同时写收藏文档和互动接口，存了两份；待定（草案问题 3）：收藏数改从本表统计，还是只由一条写入路径维护 favorites 计数。
create table market_favorite (
  member_id  text not null,
  shelf_kind text not null,                                     -- external / internal / projects
  asset_type text not null default '',                          -- tool / skill / agent / office-scene；旧记录没有时为空串
  asset_id   text not null,                                     -- 资产字符串 id
  content_id text not null,                                     -- 统计用 contentId（办公场景为 office-scene-<id>）
  title      text not null,                                     -- 展示快照
  icon       text,
  logo_url   text,
  note       text,                                              -- 用户备注
  created_at timestamptz(3) not null default now(),
  updated_at timestamptz(3) not null,
  primary key (member_id, shelf_kind, asset_type, asset_id)
);
create index market_favorite_content_idx on market_favorite (content_id);   -- 按资产统计收藏数

-- D2 点赞 / 点踩【第 5 期】来源：market_user_interaction（去掉 favorited 列）
create table market_user_vote (
  member_id  text not null,
  content_id text not null,
  vote       text,                                              -- like / dislike / 空（已取消）
  updated_at timestamptz(3) not null,
  primary key (member_id, content_id)
);

-- D3 最近浏览【第 5 期】来源：doc:market-recent.byUserId[uid][]；每人保留最近 N 条（沿用前端上限），写入时裁剪
create table market_recent_view (
  member_id  text not null,
  shelf_kind text not null,
  asset_type text not null default '',                          -- 同 id 的 Skill 与 Agent 可以并存
  asset_id   text not null,
  title      text not null,                                     -- 快照
  icon       text,
  logo_url   text,
  viewed_at  timestamptz(3) not null,
  primary key (member_id, shelf_kind, asset_type, asset_id)
);

-- D4 用户隐藏的货架项【第 5 期】来源：doc:market-hidden.byUserId[uid][]（元素格式 "<shelfKind>:<id>"）
create table market_hidden_item (
  member_id  text not null,
  shelf_kind text not null,
  asset_id   text not null,
  hidden_at  timestamptz(3) not null default now(),
  primary key (member_id, shelf_kind, asset_id)
);

-- D5 Skill 评价【第 5 期】来源：doc:skill-reviews.bySkillId[skillId][]；每个 Skill 最多保留 80 条（沿用前端上限）
create table skill_review (
  id          text primary key,
  skill_id    text not null,                                    -- Skill 字符串 id
  member_id   text not null,
  member_name text not null,                                    -- 快照
  rating      smallint not null,                                -- 1–5
  content     text not null,
  reply       text,
  replied_at  timestamptz(3),
  created_at  timestamptz(3) not null,
  updated_at  timestamptz(3) not null
);
create index skill_review_skill_idx on skill_review (skill_id, created_at);


-- ============================================================================
-- E. 消息与资讯
-- ============================================================================

-- E1 站内信【第 2 期建，第 6 期并入旧 doc:inbox】来源：InboxMessageRecord
create table inbox_message (
  id             text primary key,
  kind           text not null,                                 -- system / user / deliverable / ai_news
  title          text not null,
  body           text not null,
  from_member_id text,                                          -- fromUserId
  from_name      text not null,
  to_member_id   text not null,                                 -- toUserId；* 表示广播
  meta           jsonb,                                         -- {chatId,warroomId,warroomTitle,artifactType,query,newsDate,...}
  created_at     timestamptz(3) not null default now()
);
create index inbox_message_to_idx on inbox_message (to_member_id, created_at);

-- E2 站内信个人状态【第 2 期】来源：InboxUserMessageState
create table inbox_message_state (
  member_id  text not null,                                     -- userId
  message_id text not null references inbox_message (id) on delete cascade,
  read_at    timestamptz(3),
  deleted_at timestamptz(3),
  updated_at timestamptz(3) not null,
  primary key (member_id, message_id)
);
create index inbox_message_state_message_idx on inbox_message_state (message_id);   -- 删除消息时级联查找

-- E3 站内公告【第 6 期】来源：doc:station-announcements.items[]
create table station_announcement (
  id           text primary key,
  title        text not null,
  body         text not null,
  badge        text not null,                                   -- AI上线 / AI培训
  published    boolean not null default false,                  -- 是否在首页跑马灯露出
  published_at timestamptz(3) not null,
  created_at   timestamptz(3) not null default now(),
  updated_at   timestamptz(3) not null
);

-- E4 运营发布的 AI 新闻【第 6 期】来源：doc:ai-news.items[]
create table ai_news_post (
  id           text primary key,
  title        text not null,
  summary      text,                                            -- 跑马灯摘要
  body         text not null,
  cadence      text not null default 'daily',                   -- daily / weekly
  source       text,
  published    boolean not null default false,
  published_at timestamptz(3) not null,
  created_at   timestamptz(3) not null default now(),
  updated_at   timestamptz(3) not null
);

-- E5 AIHOT 快讯【第 6 期】来源：center_record id=doc-ai-news-archive 的 items[]（现在每次同步整包重写）
--   同步状态（updatedAt、lastSyncAt、lastSyncError、lastSyncVia）移到 app_setting('ai-news-feed.sync')。
create table ai_news_feed_item (
  id           text primary key,                                -- 如 aihot-xxxx
  published_at timestamptz(3) not null,
  date_label   text not null default '',                        -- 如 9/17周四
  title        text not null,
  summary      text not null,
  url          text not null,
  source       text,
  category     text,
  reason       text,                                            -- 推荐理由
  score        smallint,
  aihot_url    text,
  created_at   timestamptz(3) not null default now(),
  updated_at   timestamptz(3) not null
);
create index ai_news_feed_item_published_idx on ai_news_feed_item (published_at);

-- E6 AI 快讯邮件订阅【第 2 期】来源：AiBriefEmailSubscription；每人一条当前有效订阅
create table ai_brief_email_subscription (
  member_id     text primary key,                               -- userId
  member_name   text not null,                                  -- userName
  email         text not null,                                  -- 小写
  subscribed_at timestamptz(3) not null default now(),
  updated_at    timestamptz(3) not null
);
create index ai_brief_email_subscription_time_idx on ai_brief_email_subscription (subscribed_at);
create index ai_brief_email_subscription_email_idx on ai_brief_email_subscription (email);

-- E7 海外案例洞察【第 2 期】来源：CaseInsightArticle（草案之后新增）；草稿与线上版本分开存，未发布内容不得进入访客接口
create table case_insight_article (
  id                    text primary key,                       -- 应用生成 uuid
  source_case_id        text unique,                            -- 导入来源的案例 id；重复导入按它覆盖同一篇
  title                 text not null,
  summary               text not null default '',
  company               text not null default '',
  source_url            text not null default '',
  domain_ids            jsonb not null,
  tags                  jsonb not null,
  draft_html            text not null default '',
  draft_markdown        text not null,                          -- 旧版 Markdown 正文；新导入为空串
  draft_cover_image     text,                                   -- MinIO 图片地址（旧 data URL 由迁移脚本转存）
  status                text not null default 'draft',          -- draft / published / archived
  sort_order            integer not null default 0,
  version               integer not null default 1,             -- 乐观锁
  published_title       text,
  published_summary     text,
  published_company     text,
  published_source_url  text,
  published_domain_ids  jsonb,
  published_tags        jsonb,
  published_html        text,
  published_markdown    text,
  published_cover_image text,
  published_version     integer,
  published_at          timestamptz(3),
  deleted_at            timestamptz(3),                         -- 进回收站的时间
  deleted_from_status   text,                                   -- 恢复时回到的状态
  created_at            timestamptz(3) not null default now(),
  updated_at            timestamptz(3) not null
);
create index case_insight_article_list_idx on case_insight_article (status, sort_order);
create index case_insight_article_updated_idx on case_insight_article (updated_at);


-- ============================================================================
-- F. 执行与 AI
-- ============================================================================

-- F1 执行记录【第 6 期】来源：center_record kind=execution
create table execution (
  id               text primary key,                            -- 如 exec_<毫秒>_<hex>
  member_id        text,                                        -- 调用人（只用于统计，不对外返回）
  chat_id          text not null,
  asset_type       text not null default 'unknown',             -- tool / skill / agent / unknown
  asset_id         text not null,                               -- 兜底为 chat:<chatId>
  agent_type       text not null,                               -- marketing / knowledge
  agent_name       text not null,
  status           text not null,                               -- running / done / error / aborted
  source           text,                                        -- llm / scripted
  message          text not null,                               -- 用户输入（截断到 2000 字）
  error            text,
  total_time_label text,                                        -- totalTime 文案
  input_tokens     integer,
  output_tokens    integer,
  steps            jsonb,                                       -- [{skill,time,label,detail}]
  started_at       timestamptz(3) not null,
  finished_at      timestamptz(3),
  updated_at       timestamptz(3) not null                      -- 列表按它倒序
);
create index execution_updated_idx on execution (updated_at);

-- F2 AI 智库需求草稿【第 6 期】来源：center_record kind=ai-knowledge-draft；原来编码进主键的 owner 改为普通列
create table ai_knowledge_draft (
  id                  text primary key,                         -- 如 draft-<uuid>
  owner_key           text not null,                            -- user:<memberId> 或 guest:<hash>
  owner_member_id     text,                                     -- 登录用户冗余，便于按人查询
  scenario_id         text not null,                            -- gtm-sellout / ecommerce-voc / mkt-campaign / generic
  original_question   text not null,
  demand              jsonb not null,                           -- DemandSummary
  messages            jsonb not null default '[]',              -- [{id,role,text,createdAt}]
  clarification_count smallint not null default 0,
  created_at          timestamptz(3) not null default now(),
  updated_at          timestamptz(3) not null
);
create index ai_knowledge_draft_owner_idx on ai_knowledge_draft (owner_key, updated_at);

-- F3 AI 智库方案【第 6 期】来源：center_record kind=ai-knowledge-solution；生成后不再修改，只有 created_at
create table ai_knowledge_solution (
  id                text primary key,                           -- 如 solution-<uuid>
  owner_key         text not null,
  owner_member_id   text,
  scenario_id       text not null,
  title             text not null,
  domain            text not null,
  maturity          text not null,                              -- 已验证方案 / 有依据建议 / 探索性建议
  generation_source text not null,                              -- llm / rule
  model             text,
  original_question text not null,
  content           jsonb not null,                             -- demand, messages, target, actions, confirmations, evidence, diagnosis, ...
  created_at        timestamptz(3) not null
);
create index ai_knowledge_solution_owner_idx on ai_knowledge_solution (owner_key, created_at);

-- F4 模型配置【第 6 期】来源：doc:llm-config.platformModels[] 与 customModels[]
--   顶层 model / defaultModelId 存 app_setting('llm-selection')；顶层 baseUrl / apiKey 是所选模型的快照，读取时由所选模型行拼出。
--   待定（草案问题 5）：api_key 是否加密存储（需新增部署环境变量作为密钥）。
create table llm_model_config (
  scope         text not null,                                  -- platform（平台目录）/ custom（自定义扩展）
  model_id      text not null,                                  -- 调用 API 时传的 model
  source        text,                                           -- preset / platform（仅平台目录）
  label         text not null,
  provider_name text,
  base_url      text not null,                                  -- OpenAI 兼容 Base URL
  api_key       text,                                           -- 明文，或启用加密后的密文 enc:v1:...
  enabled       boolean not null default true,
  position      integer not null default 0,                     -- 目录顺序
  created_at    timestamptz(3) not null default now(),
  updated_at    timestamptz(3) not null,
  primary key (scope, model_id)
);


-- ============================================================================
-- G. 配置
-- ============================================================================

-- G1 平台配置【第 2 期建，后续各期往里加键】不需要筛选、关联或按人隔离的配置，整份 JSON 读写，revision 做乐观锁
--   setting_key（括号内为引入期次）：
--     workspace（2）              原 Workspace 行：name、namespace、description、memberCount、defaultChatId、catalog；第 6 期拆出 chats 后只留 resources
--     tool-catalog.meta（3）      原 global-tools 单例的目录版本等元数据
--     auth-policy（4）            {allowDemoPassword}
--     llm-selection（6）          {defaultModelId, model}
--     ai-news-feed.sync（6）      快讯同步状态
--     其余（6）：nav-presentation / workspace-config / external-taxonomy / business-scenario-catalog / org-taxonomy /
--       external-tool-layout / home-featured / market-featured / plaza-howto / mss-build-stats / ai-brief-email-copy /
--       warroom-webhook（可能含令牌，读取权限需复核）/ security-policy / demo-content
create table app_setting (
  setting_key          text primary key,
  value                jsonb not null,                          -- 文档内容（去掉 revision / expectedRevision）
  schema_version       integer,                                 -- 文档内 version 字段
  revision             integer not null default 0,              -- 乐观锁
  updated_by_member_id text,
  updated_at           timestamptz(3) not null
);


-- ============================================================================
-- H. 统计事实（第 2 期建；都已是关系表，只去租户、改名、改类型、整理索引；不加外键，无通用时间列）
-- ============================================================================

-- H1 资产互动累计值【第 2 期】来源：MarketEngagement
create table market_engagement_stat (
  content_id text primary key,
  views      integer not null default 0,                        -- 有符号，异常减一时不溢出报错
  uses       integer not null default 0,
  likes      integer not null default 0,
  dislikes   integer not null default 0,
  downloads  integer not null default 0,
  favorites  integer not null default 0,                        -- 见 D1 待定项
  updated_at timestamptz(3) not null
);

-- H2 资产行为事实【第 2 期】来源：MarketEngagementEvent
--   索引由 9 个整理为 4 个，去掉按 content_id / asset_type 开头的 3 个（代码里没有按这两列过滤的查询）；上线前用 EXPLAIN 复核看板查询。
create table market_engagement_event (
  id            text primary key,                               -- 应用生成 uuid（沿用现有主键）
  event_id      text unique,                                    -- 请求幂等键；可空，空值不参与唯一约束
  content_id    text not null,
  asset_type    text not null default 'unknown',                -- tool / skill / agent / office-scene / unknown
  action        text not null,                                  -- exposure / detail / view / use / redirect / download / favorite / favorite_cancel /
                                                                --   like / like_cancel / dislike / dislike_cancel / call，以及过渡值 request:<action>
  date_key      text not null,
  visitor_hash  text,
  visitor_type  text not null default 'user',                   -- user / guest
  success       boolean,                                        -- 调用是否成功（call）
  duration_ms   integer,
  input_tokens  integer,
  output_tokens integer,
  error_code    text,
  occurred_at   timestamptz(3) not null default now()
);
create index market_engagement_event_date_action_idx on market_engagement_event (date_key, action);       -- 看板按日期范围（+ 动作）
create index market_engagement_event_time_idx on market_engagement_event (occurred_at);                   -- 追踪起止时间、180 天保留期清理
create index market_engagement_event_date_visitor_idx on market_engagement_event (date_key, visitor_hash); -- 每日上限
create index market_engagement_event_visitor_time_idx on market_engagement_event (visitor_hash, occurred_at); -- 每分钟上限

-- H3 门户页面访问【第 2 期】来源：PortalPageView
--   去掉 (date_key)（是下面索引的前缀）、(date_key, visitor_type)、(date_key, journey_hash)（没有查询按这两列过滤）。
create table portal_page_view (
  event_id     text primary key,
  date_key     text not null,
  route_key    text not null,                                   -- home / me / market-external / market-internal / market-projects / ai-brief / ...
  visitor_hash text not null,
  visitor_type text not null default 'user',                    -- user / guest
  journey_hash text,                                            -- 同一浏览器的访客与登录关联
  occurred_at  timestamptz(3) not null default now()
);
create index portal_page_view_route_idx on portal_page_view (date_key, route_key);
create index portal_page_view_visitor_idx on portal_page_view (date_key, visitor_hash);   -- 每日上限

-- H4 每日登录用户【第 2 期】来源：PortalDailyLogin
create table portal_daily_login (
  date_key       text not null,
  visitor_hash   text not null,
  first_login_at timestamptz(3) not null default now(),
  primary key (date_key, visitor_hash)
);

-- H5 登录墙与转化事件【第 2 期】来源：PortalConversionEvent
--   去掉 (date_key, journey_hash)（用途可由 event_type 索引替代）、(date_key, action)（action 只用于 GROUP BY）。
create table portal_conversion_event (
  event_id     text primary key,
  date_key     text not null,
  event_type   text not null,                                   -- guest_gate_hit / login_success
  action       text,                                            -- like / dislike / favorite / download / submit-tool / submit-skill / submit-agent / chat / account
  route_key    text,
  journey_hash text not null,
  user_hash    text,
  occurred_at  timestamptz(3) not null default now()
);
create index portal_conversion_event_type_idx on portal_conversion_event (date_key, event_type);
create index portal_conversion_event_journey_idx on portal_conversion_event (journey_hash, event_type, occurred_at);


-- ============================================================================
-- 过渡表：第 2 期建，在后续期次删除
-- ============================================================================

-- 通用 JSON 记录【第 2 期建，第 6 期结束后删除】来源：CenterRecord（只迁 ws-cn-marketing 与全局记录）
--   记录 id 沿用旧值（如 marketplace-ws-cn-marketing），后端按固定工作区拼出，所以不需要 workspace_id 列。
--   各期把对应 kind 迁到正式表后删掉这里的对应行。kind=agent/skill/tool 投影行第 2 期照迁，第 3 期迁移脚本已删除；
--   旧版专家页的 /agents、/skills 改为从资产表实时映射，只有 Agent 人设可改（写回 agent.system_prompt）。
create table center_record (
  id         text primary key,
  kind       text not null,
  payload    jsonb not null,
  updated_at timestamptz(3) not null
);
create index center_record_kind_idx on center_record (kind);

-- 用户互动状态【第 2 期建，第 5 期拆成 market_user_vote 与 market_favorite 后删除】来源：MarketUserInteraction
create table market_user_interaction (
  member_id  text not null,                                     -- userId
  content_id text not null,
  vote       text,                                              -- like / dislike / 空
  favorited  boolean not null default false,
  updated_at timestamptz(3) not null,
  primary key (member_id, content_id)
);
create index market_user_interaction_favorited_idx on market_user_interaction (member_id, favorited);
