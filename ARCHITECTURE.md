# MSS Claw Platform — Architecture

## 1. 产品定位

MSS Claw 是企业级 **AI Employee Operating System**，不是聊天机器人。平台由以下能力层组成：

```
Portal → Workspace → (Prompt / Skill / Workflow) → Agent → (Memory / Knowledge / Tool) → LLM
```

## 2. 前端壳层（VSCode 式）

```
Sidebar（模块导航）
  → Workspace（租户/组织切换）
  → Explorer（资源树：Agent / Workflow / Knowledge / Prompt）
  → Editor（Chat / Studio 主编辑区）
  → Inspector（Artifact / Trace / Properties）
```

V1 已实现：`Sidebar + Explorer(Session) + Editor(Chat) + Inspector(Artifact)` 四区布局。

## 3. 模块边界

| 模块 | 职责 | 前端 | 后端（V2+） |
|------|------|------|-------------|
| Prompt Center | 模板版本、Diff、Playground | `features/prompt` | `prompt-service` |
| Skill Center | Skill 编排、Trace | `features/skill` | `skill-service` |
| Tool Center | HTTP/MCP/OpenAPI 工具 | `features/tool` | `tool-service` |
| Workflow Studio | LangGraph 可视化编排 | `features/workflow` | `workflow-service` |
| Agent Studio | Persona + 绑定关系 | `features/agent` | `agent-service` |
| Knowledge | RAG 管线 | `features/knowledge` | `knowledge-service` |
| Memory | 分层记忆 | `features/memory` | `memory-service` |
| Runtime | 执行、Trace、Replay | `api/agentRuntime` | `execution-service` |

## 4. 目录结构

```
mss-claw-platform/
├── apps/
│   └── web/                 # React SPA
├── packages/                # 共享包（V2）
│   ├── domain/              # Zod Schema
│   └── api-client/
├── services/                # NestJS 微服务（V2+）
└── docs/
```

当前 V1 将 domain/store/api 放在 `apps/web/src/` 下，V2 再抽取到 `packages/`。

## 5. 数据流（禁止 UI 直连 LLM）

```
UI (ChatPanel)
  → Zustand Store (sendMessage)
  → streamExecution() — SSE: skill_start | token | artifact | done
  → Gateway  POST /api/v1/executions/stream
  → Agent Runtime (LangGraph)
  → Store 增量更新 → UI 流式渲染
```

未配置 `VITE_API_BASE_URL` 时使用 `mockExecutionStream()`，协议与真实 SSE 一致。

## 6. 核心域模型

```typescript
Workspace → Prompt | Skill | Workflow | Agent | KnowledgeBase
Agent → { persona, llm, promptId, workflowIds, skillIds, status }
Execution → { steps[], artifact, latency, checkpoint }
Conversation → { messages[], sessionId, workspaceId }
```

## 7. 技术栈

- **前端**：TypeScript, React 19, Vite, Tailwind, Zustand, Zod, React Router
- **后端（规划）**：NestJS, Prisma, LangGraph, Redis, Kafka
- **观测**：Trace / Replay / Checkpoint 贯穿 Runtime

## 8. 部署架构（目标）

```
Ingress → Gateway → [Prompt | Workflow | Agent | Knowledge | Memory] Service → LLM Gateway
```

## 9. Roadmap

- **V1** ✅ 工程化 + Chat/Sandbox 迁移 + Mock API
- **V2** ✅ Workspace / Prompt / Skill / Agent Studio + SSE + 全 Center UI
- **V2.7** ✅ NestJS API 骨架（Workspace REST + SSE Execution + Prisma SQLite）
- **V3** LangGraph Workflow Runtime / Multi-Agent Bus / RBAC 鉴权
