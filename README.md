# MSS Claw Platform

企业级 AI Employee Operating System 原型工程。

## 在线演示

- 地址：https://mcyo-yoyoyo.github.io/MSSClaw/
- 演示账号：`mcyo@company.com` / `mssclaw`（系统管理员）
- 说明：GitHub Pages 为前端本地演示模式，数据保存在浏览器 localStorage

> 首次推送后，请到仓库 **Settings → Pages → Build and deployment**，Source 选择 **GitHub Actions**。Actions 跑通后即可访问。

## 快速启动（React 前端 · 默认）

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm install
npm run dev
```

浏览器打开 **`http://localhost:5173`**，即为完整 React 工程（智能助理 / 任务中心 / Agent·Skill·知识库 / 命令面板）。



## 可选：静态 HTML 原型



```powershell

npm run dev:prototype

```



访问 `http://localhost:5173/index.html`（根目录 `index.html` 高保真设计稿，只读 spec）。



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

├── index.html             # 静态设计稿 spec（dev:prototype）

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

| `npm run dev:prototype` | 静态 HTML 原型（:5173/index.html） |

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

