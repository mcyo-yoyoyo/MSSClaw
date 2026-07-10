# MSS Claw — Cursor Development Rules

## 技术栈（默认）

- TypeScript + React + Vite
- Tailwind CSS（构建时，禁止 CDN）
- Zustand（前端状态）
- Zod（DTO / Schema 校验）
- 后端目标：NestJS + Prisma + LangGraph

## 架构原则

1. **UI 禁止直接调用 LLM** — 所有 Agent 交互经 `api/` 层
2. **Agent / Skill / Prompt / Tool 解耦** — 不在单个组件内硬编码 Prompt
3. **Workflow Runtime 必须基于 LangGraph**（V2+）
4. **所有 Runtime 支持 Trace / Replay / Checkpoint**
5. **API 符合 REST + OpenAPI**，流式用 SSE

## 目录约定

```
apps/web/src/
├── api/           # HTTP/SSE 客户端，Mock 与真实 API 同接口
├── components/    # 纯 UI 组件
├── domain/        # Zod Schema + 类型
├── features/      # 按模块组织的页面（V2）
├── stores/        # Zustand slices
└── lib/           # 工具函数
```

## 命名规范

- 组件：`PascalCase.tsx`
- Store：`useXxxStore.ts`
- Schema：`XxxSchema` + `type Xxx = z.infer<typeof XxxSchema>`
- API 函数：动词开头 `streamAgentResponse`, `fetchPrompts`

## 编码风格

- 优先函数组件 + Hooks
- 避免 `innerHTML` / 大量 `dangerouslySetInnerHTML`
- Tailwind 动态 class 使用显式映射或 `safelist`，禁止裸模板字符串
- 新模块先写 Zod Schema，再写 Store，最后写 UI

## Git 提交

- feat / fix / refactor / docs 前缀
- 单次 PR 聚焦一个模块

## 禁止事项

- 在 UI 组件内写 LLM prompt 字符串（应来自 Prompt Center API）
- 在 `components/` 内直接 `fetch`（应走 `api/`）
- 复制粘贴 `index.html` 内联 JS 模式到新文件
- 跳过 Schema 直接写 any 类型

## Cursor 开发顺序建议

1. 读 `ARCHITECTURE.md` + 本文件
2. 确认模块属于哪个 `features/` 子目录
3. 先扩展 `domain/` Schema
4. 实现 `api/` Mock → 再接真实后端
5. 最后写 UI 组件
