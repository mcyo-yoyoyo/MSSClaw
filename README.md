# MSS Claw Platform

企业级 **AI Employee Operating System** 原型：找案例 → 学/准备/开干 → 做任务，覆盖专家、技能、知识与门户运营配置。

当前以 **React 前端 + 可选 Nest API** 运行；大量演示数据可落在浏览器 `localStorage`，API 在线时会话与 Marketplace 写入 SQLite。

## 在线演示

| 渠道 | 地址 |
|------|------|
| GitHub Pages | https://mcyo-yoyoyo.github.io/MSSClaw/ |

- 演示账号：`mcyo@huawei.com`（平台运营）；另有 `jacky` / `dickson` / `somebody` 与 `test1`–`test10@huawei.com`；
- **生产前**：在「系统设置 · 组织权限」关闭演示密码，并用「账号密码」批量配置各账号密码
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

## 内网部署与并发（约 500 人 / 64G·2T）

详见 **[docs/PERFORMANCE.md](./docs/PERFORMANCE.md)** 与 **[deploy/nginx.mssclaw.conf.example](./deploy/nginx.mssclaw.conf.example)**。

| 模式 | 约 500 并发 | 建议 |
|------|-------------|------|
| **静态前端 only** | ✅ 推荐 | Nginx 托管 `apps/web/dist`；每用户独立 localStorage |
| **前端 + Nest/SQLite** | ❌ 勿当共享业务库 | 仅小流量演示；共享写会互相覆盖且 SQLite 写串行 |

**64G + 2T 硬件余量充足**；瓶颈在架构而非内存/磁盘。静态站点约 1–2GB RAM 即可。

API 加固环境变量示例：`deploy/api.env.example`（限流、SSE 上限、可选 `API_KEY`、JSON body 上限）。

### 内网部署：去掉演示数据

代码内置了大量示例案例 / Agent / Skill / How to 等，**仅清浏览器缓存不够**——刷新后还会再灌进来。正式使用请二选一（可并用）：

1. **部署时关掉（推荐）**  
   构建前端时设置：
   ```bash
   VITE_INCLUDE_DEMO_CONTENT=false
   ```
   新打开的浏览器不会再加载系统自带示例；再通过「门户运营」导入真实案例即可。

2. **已上线环境快速清空**（需 **平台运营** 账号，如 `mcyo@huawei.com`）  
   - 入口 A：**侧栏「门户运营」** → 页头黄条旁 / 右上角 **「清空演示数据」**  
   - 入口 B：侧栏或头像菜单 **「偏好设置」** → 往下滚到 **「演示内容」** → **「清空演示数据（正式使用）」**  
   会清除本机示例缓存并关闭注入，然后刷新；**不会**清除登录、成员、租户与密码。  
   **一键恢复**：清空后同一位置会出现 **「一键恢复演示内容」**，可重新加载系统自带示例（覆盖本机门户相关数据）。  
   每个使用者的浏览器各自有一份 localStorage，若多人已打开过演示站，需各自点一次，或统一发新构建（上面第 1 步）。  
   若构建时设置了 `VITE_INCLUDE_DEMO_CONTENT=false`，则无法在浏览器里恢复演示内容。

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构与路线图  
- [docs/MIGRATION.md](./docs/MIGRATION.md) — 设计稿 → React 迁移对照  
- [CURSOR_RULES.md](./CURSOR_RULES.md) — Cursor / 协作约定  

## 路线图（摘要）

- ✅ V1–V2.7：工程化、Center UI、Mock/SSE、Nest + Prisma SQLite  
- 🔲 V3：LangGraph 真执行、生产级 RBAC / JWT、编辑器写回 API 等  
