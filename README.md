# MSSClaw

面向企业内部场景的 AI 工作平台原型。它把场景案例、Agent、Skill、工具、知识库和自动化能力组织在同一个工作空间中，让用户可以从“发现案例”进入“配置能力”，再通过任务对话执行工作。

> 当前仓库适合产品演示、交互验证和小规模试点，不应直接视为生产级多租户 AI 平台。生产级身份认证、细粒度授权、共享数据库和真实执行链路仍需继续建设。

## 核心能力

| 模块 | 能力 |
| --- | --- |
| 工作入口 | 首页任务入口、AI 快讯、场景案例、企业内外部工具集市 |
| 任务执行 | 多轮会话、Agent / Skill 调用、执行过程与交付物展示 |
| 能力中心 | Agent、Skill、工具、知识库、工作流、自动化、提示词与记忆配置 |
| 平台运营 | 门户内容、推荐位、场景分类、公告、展示方式与租户配置 |
| 平台治理 | 组织权限、资产审核、执行历史、审计和演示内容开关 |

## 运行方式

MSSClaw 按“React 前端 + Nest API”运行。共享业务数据写入 SQLite，上传文件写入 Blob 文件目录。

前端默认探测同源 `/api`。本地开发时，Vite 将 `/api` 代理到 `http://localhost:3000`。前端和后端需要同时启动；若健康检查失败、API 地址错误或响应格式不匹配，页面顶部会显示明确告警，相关共享数据可能无法加载或保存。

## 快速开始

### 环境要求

- Node.js 20（CI 使用版本）
- npm 10 或兼容版本

### 启动前端与 API

首次运行 API：

```bash
npm install
cp deploy/api.env.example apps/api/.env
npm run prisma:generate --workspace @mss-claw/api
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run prisma:seed --workspace @mss-claw/api
```

Windows PowerShell 使用下面的复制命令：

```powershell
npm install
Copy-Item deploy\api.env.example apps\api\.env
npm run prisma:generate --workspace @mss-claw/api
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run prisma:seed --workspace @mss-claw/api
```

### 按环境启动（前后端分开）

以下按环境 API 启动命令都在仓库根目录执行。它们会清空 `NODE_USE_ENV_PROXY`，并移除
`NODE_OPTIONS` 中的 `--use-env-proxy`，避免模型请求进入公司代理；AIHOT 是否创建显式
`ProxyAgent` 由 `AIHOT_PROXY_ENABLED` 单独控制。

本地开发（AIHOT 直连，即使环境里残留 `HTTPS_PROXY` 也不走显式代理）：

```bash
# 终端 1：Nest API，http://localhost:3000/api/v1
npm run dev:api:local

# 终端 2：React 前端，http://localhost:5173
npm run dev:web:local
```

测试环境（先构建，再分别启动 API 与前端预览）：

```bash
# 测试/生产启动命令会自动设置 AIHOT_PROXY_ENABLED=1；
# 只需在 apps/api/.env 或进程环境中提供：
# HTTPS_PROXY=http://proxyjp.huawei.com:8080
npm run build:api
npm run build:web:test

# 终端 1：API，http://localhost:3000
npm run start:api:test

# 终端 2：React 预览，http://localhost:4173
npm run start:web:test
```

生产环境：

```bash
# 生产启动命令会自动设置 AIHOT_PROXY_ENABLED=1；API 环境中提供 HTTPS_PROXY
npm run build:api
npm run build:web:prod
npm run start:api:prod
```

生产前端不启动 Vite 进程，将 `apps/web/dist` 交给 Nginx/IIS 等静态服务器，
并把 `/api` 反向代理到 API；`start:web:test` 只用于测试预览。

PowerShell 设置测试/生产代理时可执行：

```powershell
$env:AIHOT_PROXY_ENABLED = "1"
$env:HTTPS_PROXY = "http://proxyjp.huawei.com:8080"
npm run start:api:test
```

验证 API：

```bash
curl http://localhost:3000/api/v1/health
```

## 演示内容与账号

仓库默认包含案例、Agent、Skill、工具和知识库等演示数据。未单独设置密码且演示密码策略开启时，可使用：

| 角色 | 账号 | 初始密码 |
| --- | --- | --- |
| 平台运营 | `mcyo@huawei.com` | `mssclaw` |
| 能力运营 | `jacky@huawei.com` | `mssclaw` |
| 业务用户 | `dickson@huawei.com` | `mssclaw` |

正式使用前应关闭演示密码，并为每个账号单独设密。

正式试点构建时，可禁止注入演示内容：

```bash
VITE_INCLUDE_DEMO_CONTENT=false npm run build
```

这只影响新加载的内置内容，不会自动清理已写入浏览器的数据。已打开过系统的用户需要在“偏好设置 → 演示内容”中清理，或清除对应站点数据。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 React 前端 |
| `npm run dev:api` | 启动 Nest API（watch 模式） |
| `npm run dev:api:local` | 本地 API（不创建 AIHOT 显式代理） |
| `npm run dev:web:local` | 本地 React 前端 |
| `npm run build` | 类型检查并构建前端 |
| `npm run build:api` | 构建 API |
| `npm run build:web:test` / `npm run build:web:prod` | 测试 / 生产 React 前端构建 |
| `npm run start:api:test` / `npm run start:api:prod` | 测试 / 生产 API |
| `npm run start:web:test` | 测试 React 预览（`:4173`） |
| `npm run preview:react` | 预览 React 构建产物 |
| `npm run preview` | 预览旧版静态原型 |
| `npm run smoke` | 运行前端冒烟检查 |
| `npm run dev:prototype` | 启动旧版静态原型 |

## 配置

### 前端

可在 `apps/web/.env` 中配置：

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | API 地址；留空时使用同源 `/api` |
| `VITE_API_KEY` | 与后端 `API_KEY` 对应的请求密钥 |
| `VITE_INCLUDE_DEMO_CONTENT=false` | 构建时关闭内置演示内容 |

API 地址和密钥也可以在应用的运行时设置中覆盖。

### API

完整示例见 [`deploy/api.env.example`](./deploy/api.env.example)。关键配置包括：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 无 | Prisma SQLite 数据库地址，必须配置 |
| `PORT` | `3000` | API 端口 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端 Origin，多个值用逗号分隔 |
| `API_KEY` | 空 | 可选的全局 API 密钥 |
| `JSON_BODY_LIMIT` | `20mb` | JSON 请求体大小限制（不包含二进制流式能力包） |
| `BLOB_MAX_BYTES` | `12582912` | 普通附件最大字节数（默认 12 MiB） |
| `PACKAGE_BLOB_MAX_BYTES` | `209715200` | Skill / Agent 原始包最大字节数（默认 200 MiB） |
| `HTTP_REQUEST_TIMEOUT_MS` | `600000` | Node 接收完整请求的超时；覆盖 200 MiB 慢速上传所需时间 |
| `BLOB_ROOT` | 应用默认目录 | 上传文件存储目录 |
| `MAX_CONCURRENT_SSE` | `200` | SSE 执行流并发上限 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | 空 | OpenAI 兼容模型配置 |
| `AIHOT_PROXY_ENABLED` | 未设置（关闭） | 仅测试/生产设为 `1`；控制 AIHOT 是否允许显式 `ProxyAgent` |
| `HTTPS_PROXY` | 空 | AIHOT 代理地址；只在 `AIHOT_PROXY_ENABLED=1` 时使用 |
| `ALLOW_AI_KNOWLEDGE_RULE_FALLBACK` | 开发开启、生产关闭 | AI 智库无模型时是否允许生成带明确标识的规则方案 |
| `AI_CASE_LIBRARY_URL` | `http://localhost:4174/index.html` | AI 智库引用的海外案例库入口 |
| `AI_CASE_LIBRARY_DATA_PATH` | 空 | AI 智库 Agent 只读检索的本地 `cases.json` 路径 |
| `AI_TOOL_CATALOG_XLSX_PATH` | 空 | AI 智库 Agent 只读检索的 AI 工具清单工作簿 |
| `AI_CAPABILITY_CATALOG_XLSX_PATH` | 空 | AI 智库 Agent 只读检索的已上线 Skill/Agent 工作簿 |

未配置模型时，执行服务会尝试读取工作空间中保存的模型配置；两者都不存在时会明确报错。`ALLOW_SCRIPTED_EXECUTION=1` 仅用于本地冒烟测试。

## AI 快讯

AI 快讯由 Nest API 读取 AIHOT REST API v1 的精选内容并归档；本地默认直连，测试/生产在
`AIHOT_PROXY_ENABLED=1` 时直连失败才使用 `HTTPS_PROXY` 创建显式 `ProxyAgent`。模型请求不使用
该代理开关，也不要设置全局 `NODE_USE_ENV_PROXY=1`。页面不会把上游名称作为产品品牌展示。

- 每次进入 AI 快讯页面时主动拉取一次；停留在页面期间不自动轮询。
- 默认读取最近 7 天、最多 100 条精选内容，并按发布日期分组。
- 服务端响应声明 5 分钟共享缓存；上游 `items` 接口自身约有 60 秒共享缓存。
- 拉取失败时自动使用仓库内置的离线兜底内容，下次进入页面立即重试。
- “适合 MSS 业务”目前根据标题和摘要中的业务关键词判断；上游入选理由不等同于 MSS 适配理由。

相关接口：

```text
GET /api/v1/ai-daily-news
```

## 数据存储

启用 Nest API 后，Prisma 使用 SQLite。默认开发配置通常为：

```env
DATABASE_URL="file:./dev.db"
```

数据库文件位于 `apps/api/prisma/dev.db`。SQLite 当前只有 `Workspace` 和 `CenterRecord` 两张通用表：

| 存储范围 | 主要内容 |
| --- | --- |
| `Workspace` | 工作空间元数据、目录 JSON、部分任务会话 |
| `CenterRecord` | Agent、Skill、工具、工作流、知识库配置、市场数据、门户内容、执行记录、成员权限、账号凭据、登录会话、审计和平台配置等 JSON 数据 |

不存入 SQLite 的内容：

- AI 快讯正文实时从上游读取，SQLite 不保存快讯副本。
- 上传附件保存在后端 `data/blobs` 文件目录。
- 登录令牌和部分本机偏好保存在浏览器 `localStorage`。
- 模型本身及推理权重不保存在项目数据库中。

## 架构

```text
Browser
  └─ React 19 + Vite + Zustand
       ├─ localStorage（登录令牌与本机偏好）
       └─ /api/v1
            └─ NestJS 11
                 ├─ Prisma + SQLite
                 ├─ Blob 文件存储
                 └─ OpenAI-compatible LLM
```

前端按 `components / features / domain / stores / api` 分层；后端按工作空间、能力中心、持久化、知识检索和执行流拆分模块。详细设计见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

### 主要 API

所有接口均以 `/api/v1` 为前缀。

| 范围 | 代表接口 |
| --- | --- |
| 健康与认证 | `GET /health`、`POST /auth/login`、`GET /auth/me` |
| 工作空间 | `GET /workspaces`、`GET /workspaces/:id/catalog` |
| 共享数据 | sessions、marketplace、portal-content、docs、blobs |
| AI 快讯 | `GET /ai-daily-news` |
| AI 智库 | 需求草稿、澄清、摘要更新、方案生成和当前用户历史方案 |
| 能力中心 | agents、skills、prompts、workflows、tools、knowledge-bases、memory-stores |
| 知识检索 | 文档解析、搜索、向量状态与重建 |
| 执行 | `GET /workspaces/:id/executions`、`POST /executions/stream` |

## 目录结构

```text
MSSClaw/
├── apps/
│   ├── web/                 # React SPA
│   │   ├── public/          # 品牌与静态资源
│   │   └── src/             # 页面、组件、领域逻辑、Store 与 API 客户端
│   └── api/                 # NestJS API
│       ├── prisma/          # SQLite schema、迁移与 seed
│       └── src/             # 业务模块与控制器
├── api/                     # Vercel 边缘/函数入口
├── deploy/                  # 内网部署说明、Nginx 与环境变量示例
├── docs/                    # 使用、迁移、性能与产品文档
├── scripts/                 # 数据目录与快讯维护脚本
├── ARCHITECTURE.md
└── package.json             # npm workspaces 入口
```

## 构建与部署

### 静态前端

```bash
npm ci
npm run build
```

产物位于 `apps/web/dist`，可由 Nginx、Vercel 或其他静态服务器托管，但必须同时配置可访问的 Nest API 和 `/api` 反向代理。仓库已包含 `vercel.json` 和 GitHub Pages workflow。

已配置的演示地址：

- [Vercel](https://mssclaw.vercel.app)
- [GitHub Pages](https://mcyo-yoyoyo.github.io/MSSClaw/)

### 内网部署

共享 API 部署需要同时考虑数据库备份、Blob 持久化、反向代理、密钥管理和并发限制。操作步骤见 [`deploy/LAN-PRODUCTION.md`](./deploy/LAN-PRODUCTION.md)，容量边界见 [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md)。

当前 Prisma schema 使用 SQLite。若要支持大量用户共享写入，不能只替换连接字符串；需要迁移 datasource、重新生成迁移并完成并发与一致性验证。

## 文档

- [`docs/GUIDE.md`](./docs/GUIDE.md)：产品使用与开发指南
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)：系统架构与演进方向
- [`deploy/LAN-PRODUCTION.md`](./deploy/LAN-PRODUCTION.md)：内网部署手册
- [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md)：容量、并发和已知边界
- [`docs/MIGRATION.md`](./docs/MIGRATION.md)：静态设计稿到 React 的迁移记录
- [`CURSOR_RULES.md`](./CURSOR_RULES.md)：仓库协作约定

## 当前边界

- 默认数据库为 SQLite，适合开发和小规模试点，不适合高并发共享写入。
- API Key 和当前会话认证用于演示级保护，不等同于完整的企业 SSO、JWT 与细粒度 RBAC。
- LLM 执行使用 OpenAI 兼容接口；工作流编排和 Agent runtime 仍处于持续演进阶段。
- 后端接口不可用时，部分页面仍可能展示本地兜底数据，但新增和修改不保证保存或跨设备同步。
