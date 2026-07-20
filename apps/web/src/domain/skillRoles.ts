/**
 * 首页 · 推荐技能 · 能力角色轴（与原「推荐专家」三大类对齐）
 * - 侦察兵：外部信息采集 / 监测
 * - 高级顾问：分析洞察 / 知识决策
 * - 数字员工：生成 / 流程执行
 */

import type { AgentRoleId } from '@/domain/agentRoles';

export type SkillRoleId = AgentRoleId;

export const SKILL_ROLE_CATEGORIES = [
  {
    id: 'scout' as const,
    label: '侦察兵',
    blurb: '外部信息采集与监测',
    icon: 'fa-binoculars',
  },
  {
    id: 'advisor' as const,
    label: '高级顾问',
    blurb: '分析洞察与知识决策',
    icon: 'fa-user-tie',
  },
  {
    id: 'digital_worker' as const,
    label: '数字员工',
    blurb: '内容生成与流程执行',
    icon: 'fa-robot',
  },
];

/** Skill → 角色归类（首页「全球」小 tab） */
export const SKILL_ROLE_BY_ID: Record<string, SkillRoleId> = {
  // 侦察兵
  'skill-price-monitor': 'scout',
  'skill-launch-sentiment': 'scout',
  'skill-review-collect': 'scout',
  'skill-survey-insight': 'scout',
  'skill-retail-insight': 'scout',
  // 高级顾问
  'skill-data-analysis': 'advisor',
  'skill-doc-compliance': 'advisor',
  'skill-rag': 'advisor',
  'skill-rerank': 'advisor',
  'skill-review-translate': 'advisor',
  'skill-review-cluster': 'advisor',
  'skill-so-report': 'advisor',
  'skill-complaint-sop': 'advisor',
  // 数字员工
  'skill-file-archive': 'digital_worker',
  'skill-ppt-gen': 'digital_worker',
  'skill-meeting-minutes': 'digital_worker',
  'skill-work-summary': 'digital_worker',
  'skill-doc-gen': 'digital_worker',
  'skill-doc-parser': 'digital_worker',
  'skill-jd-parser': 'digital_worker',
  'skill-resume-screen': 'digital_worker',
  'skill-interview-analysis': 'digital_worker',
  'skill-training-gen': 'digital_worker',
  'skill-retail-coach': 'digital_worker',
  'skill-wecom': 'digital_worker',
};

export function getSkillRole(skillId: string): SkillRoleId | null {
  return SKILL_ROLE_BY_ID[skillId] ?? null;
}
