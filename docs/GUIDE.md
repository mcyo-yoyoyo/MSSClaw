# MSS Claw — 使用指南与架构说明

> 面向开发者与产品体验者的快速上手文档。更完整的 API 与迁移细节见 [README.md](../README.md)、[ARCHITECTURE.md](../ARCHITECTURE.md)。

---

## 一、项目是什么

**MSS Claw** 是企业级 **AI Employee Operating System**（AI 员工操作系统），面向营销服场景。它不是单纯的聊天窗口，而是一套可编排、可交付、可治理的 Agent 工作台：

```
智能助理（意图输入）→ 任务中心（Plan · 对话 · 交付物）→ 能力平台（Agent / Skill / 知识库 / Workflow …）
```

---

## 二、快速启动

### 2.1 仅前端（本地 Demo，无需后端）

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm install
npm run dev
```

浏览器打开 **http://localhost:5173**。数据保存在浏览器 `localStorage`，Header 显示「本地 Demo · Mock」。

### 2.2 前端 + 后端（SQLite 持久化）

**终端 1 — 初始化并启动 API：**

```powershell
cd "D:\Vibe Coding\MSSClaw\apps\api"
copy .env.example .env
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed

cd "D:\Vibe Coding\MSSClaw"
npm run dev:api
```

**终端 2 — 启动前端：**

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm run dev
```

- API 地址：`http://localhost:3000/api/v1`
- 开发模式下 Vite 将 `/api` 代理到 `localhost:3000`，Header 显示「API Runtime · 已连接」

### 2.3 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | React 前端（默认，:5173） |
| `npm run dev:api` | NestJS 后端（:3000） |
| `npm run build` | 构建前端到 `apps/web/dist` |
| `npm run smoke` | 前端 smoke 检查 |
| `npm run dev:prototype` | 静态 HTML 设计稿（只读 spec） |

---

## 三、界面使用指南

### 3.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  Header：工作区切换 · API 状态 · 命令面板(⌘K) · 设置      │
├──────────┬──────────────────────────────────────────────┤
│  侧栏     │  主内容区（按当前视图切换）                    │
│  导航     │  智能助理 / 任务中心 / 各 Center …            │
└──────────┴──────────────────────────────────────────────┘
```

侧栏分为三组：

| 分组 | 视图 | 用途 |
|------|------|------|
| **工作台** | 智能助理、任务中心 | 提交任务、Plan 确认、对话、交付物 |
| **能力平台** | Agent / Skill / Tool / Prompt / Memory / 知识库 | 配置与调用能力资产 |
| **运营编排** | 自动化、Workflow 画布 | 定时任务与可视化编排 |

### 3.2 典型工作流

**① 从智能助理提交任务**

1. 侧栏 → **智能助理**
2. 输入任务描述（可选 @Agent）
3. 提交后自动进入 **任务中心**
4. Agent 返回 **Plan** → 确认或编辑步骤 → 执行
5. 右侧 **交付物面板** 查看图表、文档、KB 引用等

**② 从 Agent 中心调用**

1. 侧栏 → **Agent 中心**
2. 选择 Agent → **调用**（或 **专家 Studio** 做深度配置）
3. 跳转到任务中心对应会话

**③ 任务中心三栏**

```
任务列表 │ 对话区 │ 交付物（Artifact）
```

- **+** 新建 WarRoom 或 Agent 任务
- **文件夹图标** 打开资源浏览器（工作区资源树）
- 任务菜单 → **复制任务链接**（分享 `#/task?chat=<id>`）
- **推送到作战室** / **导出交付物** 通过命令面板或面板按钮

**④ 命令面板（Ctrl/Cmd + K）**

快速跳转任意视图、调用 Agent/Skill、新建任务、打开 WarRoom、导出等。

**⑤ 设置抽屉（右上角 M）**

成员、KB 同步、Skill 导出、Runtime API 地址、LLM 配置等。LLM Key 存于浏览器 localStorage，不会提交到仓库。

### 3.3 工作区与语言

顶部可切换工作区（如「3C 拉美」「国内营销」等 Demo 租户）。每个工作区有独立 catalog、会话与市场数据；Header 会显示对应语言标签（中文 / English / Español）。

### 3.4 离线 / 弱网

- 断网时顶栏下方出现 **黄色 Banner**（使用本地缓存）
- API 未连接时出现 **橙色 Banner**，可点 **重试连接**

---

## 四、架构说明

### 4.1 Monorepo 结构

```
MSSClaw/
├── apps/
│   ├── web/          # React 19 + Vite 前端
│   └── api/          # NestJS 11 + Prisma SQLite 后端
├── docs/             # 文档（本文件、MIGRATION.md）
├── index.html        # 静态设计稿 spec（dev:prototype）
├── README.md
└── ARCHITECTURE.md   # 详细架构与 Roadmap
```

当前 **V1** 将 domain / store / api 客户端都放在 `apps/web/src/`，尚未抽取 `packages/`。

### 4.2 前端分层

```
main.tsx → App.tsx（壳层编排）
              ├── AppHeader / AppShellSidebar
              ├── AppViewRouter（按 AppView 懒加载页面）
              ├── CommandPalette / SettingsDrawer / Toast
              └── hooks：路由同步、平台 Store 懒加载

features/          # 页面（home, task, agent, skill, knowledge, automation）
features/_legacy/  # 专家平台页（Agent Studio, Workflow, Tool, Memory, Prompt, Admin）

components/        # UI 组件（shell, chat, task, artifact, center, …）

stores/            # Zustand 全局状态
domain/            # 领域模型、路由、命令、持久化键名
api/               # HTTP / SSE 客户端
hooks/             # 路由、Focus Trap 等
```

**路由方式**：Hash 路由（非 React Router），例如：

- `#/home` — 智能助理
- `#/task` — 任务中心
- `#/task?chat=<chatId>` — 深链到指定会话
- `#/agents`、`#/workflow` 等 — 各 Center

### 4.3 核心 Store 职责

| Store | 职责 |
|-------|------|
| `workspaceStore` | 工作区列表、catalog、API 连接状态 |
| `conversationStore` | 会话、消息、Plan、SSE 执行、交付物 |
| `marketplaceStore` | Agent / Skill / KB / 自动化市场数据 |
| `appViewStore` | 当前视图、设置抽屉开关 |
| `taskStore` | 任务列表 UI、新建任务对话框、资源浏览器 |
| `llmConfigStore` | LLM Provider / Key / Model（localStorage） |
| `agentStore` 等 | 专家平台视图数据（进入对应页面时懒加载） |

### 4.4 后端模块

| 模块 | 职责 |
|------|------|
| `WorkspacesModule` | 工作区列表 + 资源 catalog |
| `PersistenceModule` | 会话 & Marketplace 读写 |
| `CentersModule` | Agent / Skill / Prompt / Workflow / KB / Tool / Memory CRUD |
| `ExecutionsModule` | SSE Agent 执行流（当前为 mock 协议） |
| `KnowledgeRagModule` | 文档解析、检索、向量索引状态 |
| `HealthController` | `GET /api/v1/health` |

数据存 **SQLite**（`apps/api/dev.db`），Workspace catalog 与 Center 记录以 JSON 字段持久化。

### 4.5 数据流（重要原则）

**UI 不直连 LLM**。统一走 Store → API → Runtime：

```
用户输入
  → conversationStore.sendMessage()
  → approvePlan() 后 streamExecution()  [api/agentRuntime.ts]
  → POST /api/v1/executions/stream (SSE)
  → 事件：skill_start | token | artifact | done
  → Store 增量更新 → TaskChatPanel + ArtifactPanel 渲染
  → scheduleSaveSessions() → localStorage / API PUT
```

**API vs 本地回退：**

| 数据 | API | 离线回退 |
|------|-----|----------|
| Workspace catalog | `GET /workspaces/:id/catalog` | `domain/workspace.ts` 内置 |
| 会话 | `GET/PUT .../sessions` | `localStorage` |
| Marketplace | `GET/PUT .../marketplace` | `localStorage` |
| 执行流 | SSE `/executions/stream` | `agentRuntime.ts` 本地 mock |
| LLM | 用户配置的 Provider | 未配置时用 mock 流 |

写入策略：**先写 localStorage，API 在线时再同步**；API 失败不影响本地使用。

### 4.6 能力栈关系（产品模型）

```
Portal
  └── Workspace（租户）
        ├── Prompt / Skill / Tool / Workflow  （能力资产）
        ├── Agent（Persona + 绑定关系）
        ├── Knowledge Base（RAG）
        ├── Memory（长期记忆）
        └── Runtime（执行 · Trace · 交付物）
              └── LLM Gateway
```

任务中心是 **Runtime 的用户入口**；各 Center 是 **资产的配置与发布入口**。

---

## 五、环境变量

### 后端 `apps/api/.env`

| 变量 | 默认 | 说明 |
|------|------|------|
| `DATABASE_URL` | `file:./dev.db` | SQLite 路径 |
| `PORT` | `3000` | API 端口 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端 Origin |

### 前端 `apps/web/.env`（可选）

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | API 根地址；DEV 下也可依赖 Vite 代理，可不设 |

### 运行时 localStorage 键（节选）

| 键 | 用途 |
|----|------|
| `mssclaw_api` | 覆盖 API 地址（设置抽屉） |
| `mssclaw_sessions_{workspaceId}` | 按工作区的任务会话 |
| LLM 相关 | `llmConfigStore` 管理 |

---

## 六、开发约定（摘要）

详见 [CURSOR_RULES.md](../CURSOR_RULES.md)：

1. **UI 不直连 LLM**，经 Store + `agentRuntime` 走 SSE
2. 新页面放 `features/`，共享组件放 `components/`
3. 领域类型与 Zod Schema 放 `domain/`
4. 专家平台页暂放 `features/_legacy/`，按需 lazy load
5. 路由变更同步更新 `domain/appView.ts` 与 `AppViewRouter`

---

## 七、Roadmap 一览

| 阶段 | 状态 | 内容 |
|------|------|------|
| V1 | ✅ | React 工程化、任务流、Mock Runtime |
| V2 | ✅ | 全 Center UI、Agent Studio、SSE 协议 |
| V2.7 | ✅ | NestJS + Prisma SQLite、Workspace REST |
| V3 | 规划中 | LangGraph 真实执行、RBAC JWT、Multi-Agent Bus |

---

## 八、验证清单

- [ ] `npm run dev` 打开首页，提交任务 → Plan → 交付物
- [ ] 刷新页面后会话仍在（API 或 localStorage）
- [ ] `npm run dev:api` + `npm run dev`，Header 显示 API 已连接
- [ ] `#/task?chat=<id>` 深链打开指定任务
- [ ] ⌘K 命令面板可跳转各 Center
- [ ] `npm run build` 无报错

---

*最后更新：2026-07-09*
