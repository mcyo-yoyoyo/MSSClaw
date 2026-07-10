import type { ModuleId } from '@/domain/chat';

const MODULE_COPY: Record<Exclude<ModuleId, 'chat'>, { title: string; description: string; icon: string }> = {
  agent: {
    title: 'Agent Studio',
    description: '配置 Persona、Prompt、Workflow、Skills，并支持 Test / Publish / Trace。',
    icon: 'fa-robot',
  },
  prompt: {
    title: 'Prompt Center',
    description: 'Draft → Testing → Approved → Released 全生命周期，支持 Diff / Playground / Rollback。',
    icon: 'fa-file-lines',
  },
  skill: {
    title: 'Skill Center',
    description: 'Skill 调试、Trace、依赖关系与版本管理。',
    icon: 'fa-puzzle-piece',
  },
  tool: {
    title: 'Tool Center',
    description: 'HTTP / MCP / OpenAPI / Function 工具注册与 Credential 管理。',
    icon: 'fa-screwdriver-wrench',
  },
  workflow: {
    title: 'Workflow Studio',
    description: '基于 LangGraph 的可视化编排：Start / LLM / Skill / Condition / Approval / End。',
    icon: 'fa-layer-group',
  },
  knowledge: {
    title: 'Knowledge Center',
    description: 'Document → Chunk → Embedding → Index → Retriever 全链路管理。',
    icon: 'fa-database',
  },
  memory: {
    title: 'Memory Center',
    description: 'Session / Workspace / Agent / Long Memory 分层与 Retention 策略。',
    icon: 'fa-brain',
  },
  settings: {
    title: 'Workspace Settings',
    description: 'Workspace 成员、RBAC 权限矩阵与 Namespace 隔离配置。',
    icon: 'fa-gear',
  },
};

export function ModulePlaceholder({
  module,
  resourceName,
}: {
  module: Exclude<ModuleId, 'chat'>;
  resourceName?: string;
}) {
  const copy = MODULE_COPY[module];

  return (
    <div className="flex flex-grow flex-col items-center justify-center bg-[#fafafa]/50 p-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <i className={`fa-solid ${copy.icon} text-3xl`} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-[#1d1d1f]">{copy.title}</h2>
      {resourceName && (
        <p className="mb-3 rounded-full border border-zinc-200 bg-claw-50 px-4 py-1 text-xs font-bold text-claw-600">
          当前资源：{resourceName}
        </p>
      )}
      <p className="max-w-lg text-sm leading-relaxed text-[#86868b]">{copy.description}</p>
      <span className="mt-6 rounded-full border border-dashed border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-600">
        V2 模块骨架 · 待接入 API
      </span>
    </div>
  );
}
