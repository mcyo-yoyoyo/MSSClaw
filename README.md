# MSS Claw Platform

企业级 **AI Employee Operating System** 原型：找案例 → 学/准备/开干 → 做任务，覆盖专家、技能、知识与门户运营配置。

当前以 **React 前端 + 可选 Nest API** 运行；大量演示数据可落在浏览器 `localStorage`，API 在线时会话与 Marketplace 写入 SQLite。

## 在线演示

| 渠道 | 地址 |
|------|------|
| GitHub Pages | https://mcyo-yoyoyo.github.io/MSSClaw/ |
| Vercel | https://mssclaw.vercel.app/ |

- 演示账号：`mcyo@company.com` / `mssclaw`（平台运营 / 系统管理员）
- 统一演示密码：`mssclaw`（登录页可选其他角色账号）
- 与本地 `npm run dev` 为同一套 React 应用（静态托管 `apps/web` 构建产物）

### Vercel

只部署前端，**不要**把 Framework 设为 Nest/Node 或 Root 指到 `apps/api`。

| 项 | 建议 |
|----|------|
| Root Directory | 仓库根（已有根目录 `vercel.json`）或 `apps/web` |
| Framework | Vite / Other |
| Build | `npm run build --workspace @mss-claw/web` |
| Output | `apps/web/dist`（Root 为仓库根时） |
| 数据库 / Serverless | 不需要（纯静态即可） |

### GitHub Pages

推送 `main` 后 Actions 构建并写入 **`gh-pages` 分支**。Pages 源请选该分支，勿指向 `main` 根目录（会变成 README/Jekyll），也勿启用自动 Deploy Jekyll 工作流。

## 快速开始

### 前端（默认）

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm install
npm run dev
```

浏览器打开 **http://localhost:5173**。

### 可选：后端 API + SQLite 持久化

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm install

cd apps/api
# 若无 .env，可手动创建，内容示例：
# DATABASE_URL="file:./dev.db"
# PORT=3000
# CORS_ORIGIN=http://localhost:5173
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed

cd ../..
npm run dev:api   # 终端 1 · http://localhost:3000/api/v1
npm run dev       # 终端 2 · Vite 代理 /api → 3000
```

- API 在线：任务会话、Marketplace 等写入 SQLite  
- API 离线：自动回退 `localStorage`

### 可选：静态 HTML 设计稿

```powershell
npm run dev:prototype
```

访问 `http://localhost:5173/docs/legacy-prototype/index.html`（只读旧稿）。

## 产品能力（原型）

| 区域 | 说明 |
|------|------|
| 找案例 | 场景方案卡；橱窗预览前沿洞察 / 场景案例 / 培训课件 |
| 做任务 | 场景技能 / 专家入口 → 对话执行 |
| 场景案例 | 学习 / 准备 / 开干预览（业务从找案例进入） |
| 能力配置 | 配置专家、技能、工具、知识等（按角色与展示配置开关） |
| 门户运营 | **场景方案包唯一配置入口**：三槽分责（洞察 / 案例 / 课件）+ 职能·区域筛选 |
| 系统设置 | 成员与组织、角色权限、部门区域、审计、展示配置等 |

角色示意：`super_admin`（平台运营）、`capability_ops`（能力开发）、`business_user`、`viewer`。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19、TypeScript、Vite 6、Tailwind CSS 3、Zustand、Zod、React Router 7 |
| 其他前端库 | Chart.js、xlsx、fflate、clsx / tailwind-merge |
| 后端（可选） | NestJS 11、Prisma 6、SQLite |
| 工程 | npm workspaces（`apps/web`、`apps/api`） |

规划中（未作为运行时硬依赖）：LangGraph 真执行、Redis / Kafka、生产级 JWT RBAC 等，见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

代码规模约：**TS/TSX 近 5 万行**（不含 `node_modules` / `dist`）。

## 目录结构

```
MSSClaw/
├── apps/
│   ├── web/                 # React SPA（默认入口）
│   │   └── src/
│   │       ├── components/  # UI 组件
│   │       ├── domain/      # 领域模型与业务逻辑
│   │       ├── features/    # 页面（home / ai-map / ops / …）
│   │       ├── stores/      # Zustand
│   │       └── …
│   └── api/                 # NestJS + Prisma（可选）
├── docs/
│   ├── legacy-prototype/    # 静态设计稿
│   └── MIGRATION.md
├── ARCHITECTURE.md
├── CURSOR_RULES.md
├── vercel.json
└── package.json             # workspaces 脚本
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | React 前端 :5173 |
| `npm run dev:react` | 同上 |
| `npm run dev:prototype` | 静态 HTML 原型 |
| `npm run dev:api` | Nest API |
| `npm run build` | 构建前端 → `apps/web/dist` |
| `npm run build:api` | 构建 API |
| `npm run preview` / `preview:react` | 预览前端构建 |
| `npm run smoke` | 前端冒烟脚本 |

## API（V1 骨架）

| 端点 | 说明 |
|------|------|
| `GET /api/v1/health` | 健康检查 |
| `GET /api/v1/workspaces` | Workspace 列表 |
| `GET /api/v1/workspaces/:id/catalog` | 资源目录 |
| `GET/PUT /api/v1/workspaces/:id/sessions` | 任务会话 |
| `GET/PUT /api/v1/workspaces/:id/marketplace` | Agent / Skill / 自动化 / KB |
| `POST /api/v1/executions/stream` | SSE 执行流 |

## 内网部署建议

**轻量（推荐试用）**：Node 20/22 LTS 构建前端 → Nginx / IIS 托管 `apps/web/dist`。无需数据库。约 2C / 4GB 即可。

**前端 + API**：再跑 Nest 进程，Prisma 使用 **SQLite 文件**（可写目录）；Nginx 反代静态资源与 `/api`。约 4C / 8GB。当前无官方 Docker 镜像；正式生产前需补强鉴权、备份与多租户隔离。

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构与路线图  
- [docs/MIGRATION.md](./docs/MIGRATION.md) — 设计稿 → React 迁移对照  
- [CURSOR_RULES.md](./CURSOR_RULES.md) — Cursor / 协作约定  

## 路线图（摘要）

- ✅ V1–V2.7：工程化、Center UI、Mock/SSE、Nest + Prisma SQLite  
- 🔲 V3：LangGraph 真执行、生产级 RBAC / JWT、编辑器写回 API 等  
