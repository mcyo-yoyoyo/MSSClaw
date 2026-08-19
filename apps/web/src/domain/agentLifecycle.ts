/**
 * Agent 成熟度状态（《Agent Hub详情页重构修改计划 0818》§1.5 / §5）
 *
 * 与「当前登录人此刻能不能点运行」是两个维度，不可混用：
 * - lifecycleStatus：Agent 自身的建设成熟度，由运营配置，决定状态标签与主按钮；
 * - canRun：运行时判断（展示预设是否开放打样、当前角色有无执行权、依赖是否齐备），
 *   同一个 Agent 换个角色或换个部署就会变，用它驱动「建设中」标签会前后矛盾。
 */

export type AgentLifecycleStatus = 'runnable' | 'building';

export interface AgentLifecycleMeta {
  id: AgentLifecycleStatus;
  label: string;
  /** 顶部状态标签的完整文案，含能力补充说明 */
  badgeText: (opts: { hasDemo: boolean; hasSolutionDoc: boolean }) => string;
  badgeClass: string;
  dotClass: string;
}

export const AGENT_LIFECYCLE_META: Record<AgentLifecycleStatus, AgentLifecycleMeta> = {
  runnable: {
    id: 'runnable',
    label: '可运行',
    badgeText: () => '可运行 · 支持在线体验',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
    dotClass: 'bg-emerald-500',
  },
  building: {
    id: 'building',
    label: '建设中',
    // §5.2：建设中要同时说明当前可看什么，避免页面显得没有价值
    badgeText: ({ hasDemo, hasSolutionDoc }) =>
      hasDemo
        ? '建设中 · Demo可查看'
        : hasSolutionDoc
          ? '建设中 · 方案包可查看'
          : '建设中 · 敬请期待',
    badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
    dotClass: 'bg-amber-500',
  },
};

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
