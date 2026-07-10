# MSS Claw 设计稿 → React 迁移对照

> 保守分步迁移。默认使用 `npm run dev`（:5173）验证 React 工程；静态原型见 `npm run dev:prototype`。

## Phase 0 · 单一数据源（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `DEFAULT_AGENTS` | `src/domain/prototype/agents.ts` |
| `DEFAULT_SKILLS` | `src/domain/prototype/skills.ts` |
| `DEFAULT_KB_DOCS` + `KB_COLLECTIONS` | `src/domain/prototype/kb.ts` |
| `DEFAULT_AUTOMATIONS` | `src/domain/prototype/automations.ts` |
| `WORKSPACES` | `src/domain/prototype/workspaces.ts` |
| `HOME_SUBCATS` | `src/domain/prototype/home.ts` |
| `MARKET_VERSION` / `KB_VERSION` | `src/domain/prototype/constants.ts` |
| — | `src/domain/prototype/adapters.ts`（映射到 Agent/Skill/KB 领域模型） |

**已接入：**

- `domain/agent.ts` · `ws-cn-marketing` / `ws-3c-latam` → 14 个 Phase1 Agent
- `domain/skill.ts` · 同上 → 23 个 Skill
- `domain/knowledge.ts` · 同上 → 21 篇文档企业知识库
- `domain/workspace.ts` · 新增 `ws-cn-marketing` 工作区 catalog

**验证方式：**

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm run dev:react
```

打开 Agent 中心 / Skill 中心 / Knowledge 中心，应看到设计稿中的华为 MSS Phase1 数据（名称与描述为中文业务场景）。

---

## Phase 1 · 华为红 Design Tokens + 应用壳层（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `:root` / `claw` 色板 | `tailwind.config.js` + `src/index.css` |
| `apple-header` 顶栏 | `components/shell/AppHeader.tsx` |
| 分组侧栏 + 折叠 | `components/shell/AppShellSidebar.tsx` |
| `switchAppView()` | `stores/appViewStore.ts` + `domain/appView.ts` |
| 设置抽屉 | `components/shell/SettingsDrawer.tsx` |
| home / task / automation 占位 | `components/shell/AppViewPlaceholder.tsx` |

**已接入：**

- `App.tsx` 使用 Header + Sidebar + AppView 路由（替代旧 `AppSidebar`）
- Agent / Skill / 知识库 视图直接渲染对应 Center 页面
- 智能助理 / 任务中心 / 自动化 显示 Phase 占位页

**验证方式：**

```powershell
cd "D:\Vibe Coding\MSSClaw"
npm run dev:react
```

打开 `:5174`，应看到华为红顶栏、分组侧栏；切换 Agent/Skill/知识库可进入对应中心。

---

## Phase 2 · 智能助理首页（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `view-home` 布局 | `features/home/HomePage.tsx` |
| 分类 Pill + 子场景 Chip | `domain/prototype/home.ts` + `stores/homeStore.ts` |
| 命令输入框 + `/` `@` 菜单 | `components/home/HomeCommandBox.tsx` |
| Agent / Skill 选择器 | `components/home/HomePickerModal.tsx` |
| 模型 API 配置 | `domain/llmConfig.ts` + `stores/llmConfigStore.ts` |
| 推荐 Agent 卡片 | `HomePage` featured grid |
| 工作台流转卡片 | `HomePage` flow section |
| `submitHomeTask()` | `conversationStore.createAgentTaskSession` → 跳转任务中心 |

**验证方式：**

```powershell
npm run dev:react
```

打开智能助理：切换分类、点击子场景 Chip、输入 `/` 或 `@`、提交任务应跳转任务中心（Phase 3 占位）并 Toast 提示。

---

## Phase 3 · 任务中心（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `view-task` 三栏布局 | `features/task/TaskCenterPage.tsx` |
| 任务列表 + WarRoom/Agent 分组 | `components/task/TaskListPanel.tsx` |
| 对话面板 + Plan 卡片 | `components/chat/TaskChatPanel.tsx` + `PlanMessageCard.tsx` |
| 执行步骤流 | `StepMessageRow.tsx` + `domain/plan.ts` |
| 交付物工作区 | `ArtifactPanel.tsx`（示例任务 + 华为红 Tab） |
| `handleSend` → Plan → 确认执行 | `conversationStore.sendMessage` + `approvePlan` |
| 新建任务 / WarRoom | `CreateTaskDialog.tsx` |

**验证方式：**

```powershell
npm run dev:react
```

从智能助理提交任务 → 任务中心出现 Plan 卡片 → 确认执行 → 右侧交付物工作区渲染。

---

## Phase 4 · Center UI 对齐设计稿（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `view-agents` 市场网格 | `features/agent/AgentCenterPage.tsx` |
| `view-skills` 统计 + 网格 | `features/skill/SkillCenterPage.tsx` |
| `view-kb` 集合侧栏 + 文档列表 | `features/knowledge/KnowledgeCenterPage.tsx` |
| `view-automation` 自动化列表 | `features/automation/AutomationCenterPage.tsx` |
| `filter-chip` / `kb-collection-btn` | `src/index.css` |
| `renderAgentMarket()` 等 | `stores/marketplaceStore.ts` |
| 共享 Modal / Header / Chips | `components/center/CenterShell.tsx` |
| `invokeAgent` / `invokeSkill` / `askKbDocument` | `App.tsx` → 任务中心调用链 |

**已接入：**

- Agent 中心：提效维度筛选、搜索、卡片网格、详情 Modal、「调用」跳转任务中心
- Skill 中心：统计卡片、筛选、调用 / 下载 / 详情 / 编辑
- 知识库：集合侧栏、文档列表、预览、「向 Agent 提问」→ 知识检索 Agent
- 自动化编排：运行 / 暂停 / 立即运行触发 Agent 任务

**验证方式：**

```powershell
npm run dev:react
```

侧栏进入 Agent / Skill / 知识库 / 自动化编排，UI 应与 `index.html` 市场布局一致；点击「调用」或「向 Agent 提问」应跳转任务中心。

---

## Phase 5 · 命令面板 + 路由（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` |
|---------------------|------------------|
| `#command-palette` | `components/shell/CommandPalette.tsx` |
| `COMMANDS` + `filterCommands` | `domain/commands.ts` |
| `openCommandPalette` / ⌘K | `stores/commandPaletteStore.ts` + 全局快捷键 |
| `switchAppView()` | `domain/appRoute.ts` + `hooks/useAppRouting.ts` |

**已接入：**

- 顶栏搜索按钮 / `Ctrl+K` / `⌘K` 打开命令面板
- 键盘 ↑↓ 选择、Enter 执行、ESC 关闭
- 14 条命令：导航、调用 Agent、WarRoom、新建任务、导出、推送、设置
- URL hash 路由（`#/home`、`#/task` …）与侧栏视图同步，支持浏览器前进/后退

**验证方式：**

```powershell
npm run dev:react
```

按 `Ctrl+K` 打开命令面板 → 选择「打开 Agent 中心」→ URL 变为 `#/agents`；浏览器后退应回到上一视图。

---

## Phase 6 · 后端持久化 + 切换默认 dev（✅ 已完成）

| 设计稿 `index.html` | React `apps/web` + API |
|---------------------|------------------------|
| `saveMarketplace()` / `saveTaskSessions()` | `domain/persistence/storage.ts` |
| localStorage 键名 | `domain/persistence/keys.ts` |
| — | `api/persistenceApi.ts` |
| — | `PUT/GET .../workspaces/:id/sessions` |
| — | `PUT/GET .../workspaces/:id/marketplace` |
| `npm run dev` → index.html | `npm run dev` → React (:5173) |

**已接入：**

- NestJS `PersistenceModule`：会话 chats 写入 `Workspace.catalogJson`；Marketplace 写入 `CenterRecord`
- `marketplaceStore.bootstrap()` / 变更后 debounce 持久化
- `conversationStore` 新建任务、Plan、执行完成后 debounce 持久化
- API 不可用时回退 localStorage（与 index.html 共享键名）
- `npm run dev` 默认启动 React；`npm run dev:prototype` 托管静态设计稿

**验证方式：**

```powershell
npm run dev:api    # 终端 1
npm run dev        # 终端 2
```

新建任务 → 刷新页面 → 任务仍在列表；顶栏显示「API Runtime · 已连接」。停 API 后仍可通过 localStorage 恢复。

---

## 迁移完成

Phase 0–6 已全部完成。`index.html` 仍为产品 spec，新功能以 React 工程为准。

---

## 维护约定

1. **改种子数据时**：优先改 `domain/prototype/*.ts`，再同步 `index.html`（或后续用脚本双向同步）
2. **不要**在 `agent.ts` / `skill.ts` 里直接写业务 mock
3. 原型 HTML 仍为产品 spec（`npm run dev:prototype`），新功能以 React 工程为准
