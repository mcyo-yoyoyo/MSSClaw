/**
 * [INPUT]: 读取 Agent 成熟度、上架状态、已挂载技能及运行权限。
 * [OUTPUT]: 提供成熟度选项、状态解析和详情页主操作选择。
 * [POS]: 编辑器配置成熟度，详情页据此选择使用入口。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */

export type AgentLifecycleStatus = 'runnable' | 'building';

export const AGENT_LIFECYCLE_OPTIONS: { id: AgentLifecycleStatus; label: string; hint: string }[] = [
  {
    id: 'runnable',
    label: '可运行',
    hint: '已支持平台内在线体验，主按钮为「立即体验」',
  },
  {
    id: 'building',
    label: '建设中',
    hint: '暂不支持在线运行，主按钮为「查看 Demo」；无 Demo 时降级为「查看方案文档」',
  },
];

/** 解析状态所依赖的最小字段集，避免与 prototype/types 形成循环依赖 */
export interface AgentLifecycleSource {
  lifecycleStatus?: AgentLifecycleStatus;
  published?: boolean;
  skillIds?: string[];
}

/**
 * 运营未配置时的兜底：已上架且挂了 Skill 视为可运行，否则建设中。
 * 存量 17 个 Agent 都没有该字段，靠这里给出合理默认，不必先补数据。
 */
export function resolveAgentLifecycle(agent: AgentLifecycleSource): AgentLifecycleStatus {
  if (agent.lifecycleStatus) return agent.lifecycleStatus;
  return agent.published && (agent.skillIds?.length ?? 0) > 0 ? 'runnable' : 'building';
}

/** §5.3 主按钮：状态唯一，且建设中无 Demo 时降级为方案文档 */
export type AgentPrimaryActionId = 'experience' | 'demo' | 'solution' | 'none';

export interface AgentPrimaryAction {
  id: AgentPrimaryActionId;
  label: string;
  icon: string;
  /** 不可用时的说明；为空表示可用 */
  disabledHint?: string;
}

export function resolveAgentPrimaryAction(opts: {
  status: AgentLifecycleStatus;
  /** 运行时是否真的可点（权限 / 展示预设 / 依赖） */
  canRun: boolean;
  hasDemo: boolean;
  hasSolutionDoc: boolean;
}): AgentPrimaryAction {
  if (opts.status === 'runnable') {
    return {
      id: 'experience',
      label: '立即体验',
      icon: 'fa-play',
      disabledHint: opts.canRun
        ? undefined
        : '当前登录角色或部署未开放在线体验，可先查看案例与方案材料',
    };
  }
  if (opts.hasDemo) {
    return { id: 'demo', label: '查看 Demo', icon: 'fa-circle-play' };
  }
  if (opts.hasSolutionDoc) {
    return { id: 'solution', label: '查看方案文档', icon: 'fa-file-lines' };
  }
  return {
    id: 'none',
    label: '暂无可用入口',
    icon: 'fa-hourglass-half',
    disabledHint: '该 Agent 仍在建设中，暂未提供 Demo 或方案材料',
  };
}
