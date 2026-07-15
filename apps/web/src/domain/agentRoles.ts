/**
 * 首页 · 推荐专家 · Agent 角色轴
 * - 侦察兵：外部信息洞察
 * - 高级顾问：业务专家 · 数据 / 内容分析
 * - 数字员工：流程优化与自动化执行
 */

export type AgentRoleId = 'scout' | 'advisor' | 'digital_worker';

export const AGENT_ROLE_CATEGORIES: {
  id: AgentRoleId;
  label: string;
  blurb: string;
  icon: string;
}[] = [
  {
    id: 'scout',
    label: '侦察兵',
    blurb: '外部信息洞察',
    icon: 'fa-binoculars',
  },
  {
    id: 'advisor',
    label: '高级顾问',
    blurb: '业务专家 · 数据与内容分析',
    icon: 'fa-user-tie',
  },
  {
    id: 'digital_worker',
    label: '数字员工',
    blurb: '流程优化与自动化执行',
    icon: 'fa-robot',
  },
];

/** Agent → 角色归类 */
export const AGENT_ROLE_BY_ID: Record<string, AgentRoleId> = {
  // 侦察兵 · 外部信息洞察
  'agent-price-monitor': 'scout',
  'agent-launch-sentiment': 'scout',
  'agent-review': 'scout',
  'agent-survey': 'scout',
  'agent-retail-insight': 'scout',
  // 高级顾问 · 数据 / 内容分析
  'agent-data-analysis': 'advisor',
  'agent-doc-review': 'advisor',
  'agent-knowledge': 'advisor',
  // 数字员工 · 流程与自动化
  'agent-file-organize': 'digital_worker',
  'agent-ppt': 'digital_worker',
  'agent-meeting': 'digital_worker',
  'agent-hr-resume': 'digital_worker',
  'agent-training': 'digital_worker',
  'agent-retail-coach': 'digital_worker',
};

export function getAgentRole(agentId: string): AgentRoleId | null {
  return AGENT_ROLE_BY_ID[agentId] ?? null;
}

export function agentBelongsToRole(agentId: string, roleId: AgentRoleId): boolean {
  return getAgentRole(agentId) === roleId;
}

export function getAgentsByRole(agentIds: string[], roleId: AgentRoleId): string[] {
  return agentIds.filter((id) => agentBelongsToRole(id, roleId));
}
