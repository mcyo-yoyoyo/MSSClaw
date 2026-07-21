# MSS Claw Platform

企业级 AI Employee Operating System 原型工程。

## 在线演示

- GitHub Pages：https://mcyo-yoyoyo.github.io/MSSClaw/
- Vercel：https://mssclaw.vercel.app/（静态托管 `apps/web` 构建产物，与 Pages 同一套 React 应用）
- 演示账号：`mcyo@company.com` / `mssclaw`（系统管理员）
- 说明：与本地 `npm run dev` 同一套 React 应用（GitHub Actions / Vercel 构建 `apps/web`）

### Vercel 部署注意

本仓库是 **Vite 静态前端** + 可选 Nest API。Vercel 演示站只发前端，**不要**把 Framework 设成 Nest/Node 或把 Root 指到 `apps/api`，否则会出现 `FUNCTION_INVOCATION_FAILED`。

推荐项目设置（或依赖根目录 / `apps/web` 的 `vercel.json`）：

1. **Root Directory**：仓库根，或 `apps/web`
2. **Framework**：Vite（或 Other）
3. **Build Command**：`npm run build --workspace @mss-claw/web`（Root 为仓库根时）
4. **Output Directory**：`apps/web/dist`（Root 为仓库根时）或 `dist`（Root 为 `apps/web` 时）
5. 不需要配置 Serverless / Database；原型前端可纯静态运行

### 重要：GitHub Pages 发布源

推送到 `main` 后，Actions 会构建 React 并写入 **`gh-pages` 分支**。请把 Pages 指到该分支，否则会看到仓库 README（Jekyll），而不是登录页。

**推荐（Deploy from a branch）：**

1. 仓库 **Settings → Pages → Build and deployment → Source** = **Deploy from a branch**
2. **Branch** = `gh-pages`，Folder = `/ (root)`，保存
3. **Actions** 里 `Deploy GitHub Pages` 成功（会更新 `gh-pages`）
4. 其他电脑用**无痕窗口**打开 https://mcyo-yoyoyo.github.io/MSSClaw/（避免旧缓存）

**备选：** Source = **GitHub Actions**（同一工作流也会尝试 `deploy-pages`）。

不要选 Branch = `main` / root：根目录没有站点入口，只会渲染 README。

不要启用 GitHub 自动生成的 **Deploy Jekyll** 工作流（会覆盖成 README 站）；本仓库只需保留 `Deploy GitHub Pages`。

## 快速启动（React 前端 · 默认）

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm install
npm run dev
```

浏览器打开 **`http://localhost:5173`**，即为完整 React 工程（逛广场·AI任务 / 做任务 / Agent·Skill·知识库 / 命令面板）。



## 可选：静态 HTML 原型

```powershell
npm run dev:prototype
```

访问 `http://localhost:5173/docs/legacy-prototype/index.html`（已迁至 `docs/legacy-prototype/`，只读设计稿）。



## 快速启动（后端 API + 持久化）



```powershell

cd "D:\Vibe Coding\MSSClaw"

npm install



cd apps/api

copy .env.example .env

npm run prisma:generate

npx prisma migrate deploy

npm run prisma:seed



cd ../..

npm run dev:api   # 终端 1

npm run dev       # 终端 2

```



API 默认地址：`http://localhost:3000/api/v1`



React 在 DEV 模式下通过 Vite 代理 `/api → localhost:3000`。API 在线时：



- 任务会话与 Marketplace 写入 SQLite

- 离线时自动回退 `localStorage`（与 `index.html` 键名对齐）



## 目录结构



```

MSSClaw/

├── docs/legacy-prototype/ # 静态设计稿 spec（旧版单页）

├── apps/

│   ├── web/               # React 前端（npm run dev 默认）

│   └── api/               # NestJS + Prisma 后端

├── docs/MIGRATION.md      # 设计稿 → React 迁移对照

├── ARCHITECTURE.md

└── CURSOR_RULES.md

```



## 脚本一览



| 命令 | 说明 |

|------|------|

| `npm run dev` | **React 前端（:5173，默认）** |

| `npm run dev:prototype` | 静态 HTML 原型（docs/legacy-prototype） |

| `npm run dev:react` | 同 `dev`（别名） |

| `npm run dev:api` | NestJS 后端 API |

| `npm run build` | 构建 React 前端 |

| `npm run build:prototype` | 构建静态原型到 `dist/` |



## 后端 API（V1）



| 端点 | 说明 |

|------|------|

| `GET /api/v1/health` | 健康检查 |

| `GET /api/v1/workspaces` | Workspace 列表 |

| `GET /api/v1/workspaces/:id/catalog` | Workspace 资源目录 |

| `GET/PUT /api/v1/workspaces/:id/sessions` | 任务会话持久化 |

| `GET/PUT /api/v1/workspaces/:id/marketplace` | Agent/Skill/自动化/KB 市场数据 |

| `POST /api/v1/executions/stream` | SSE Agent 执行流 |



## 设计稿迁移



React 工程已从 `index.html` 完成 Phase 0–6 迁移，详见 [docs/MIGRATION.md](docs/MIGRATION.md)。



验证任务流：`npm run dev` → 提交任务 → Plan 确认 → 交付物；刷新页面后会话应保留（API 或 localStorage）。



## 下一步



- RBAC JWT 鉴权中间件

- LangGraph Workflow Runtime 真实执行

- Center 编辑器写回 API

