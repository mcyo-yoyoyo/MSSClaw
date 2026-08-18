/**
 * Skill 上架生命周期状态（配置 Skill 列表筛选用）
 *
 * Skill 自身只有 published 布尔值，「审批中」需要 join 资产审批记录：
 * 存在 status=pending 的记录即视为审批中，其优先级高于 published。
 */

import type { AssetApprovalRecord } from '@/stores/assetApprovalStore';

export type SkillLifecycleStatus = 'published' | 'pending' | 'unpublished';

export type SkillLifecycleFilter = 'all' | SkillLifecycleStatus;

export const SKILL_LIFECYCLE_FILTER_OPTIONS: {
  id: SkillLifecycleFilter;
  label: string;
}[] = [
  { id: 'all', label: '全部' },
  { id: 'published', label: '已上架' },
  { id: 'pending', label: '审批中' },
  { id: 'unpublished', label: '已下架' },
];

export const SKILL_LIFECYCLE_LABELS: Record<SkillLifecycleStatus, string> = {
  published: '已上架',
  pending: '审批中',
  unpublished: '已下架',
};

/** 取该资产上仍在流转的审批记录（同资产可能有多条历史，只认 pending） */
export function findPendingApproval(
  approvals: AssetApprovalRecord[],
  assetId: string,
): AssetApprovalRecord | undefined {
  return approvals.find(
    (record) =>
      record.kind === 'skill' && record.assetId === assetId && record.status === 'pending',
  );
}

export function resolveSkillLifecycleStatus(
  skill: { id: string; published?: boolean },
  approvals: AssetApprovalRecord[],
): SkillLifecycleStatus {
  // 审批中优先：上架后再发起更新/下架申请时，运营更关心「有流程在跑」
  if (findPendingApproval(approvals, skill.id)) return 'pending';
  return skill.published ? 'published' : 'unpublished';
}

export function skillMatchesLifecycleFilter(
  skill: { id: string; published?: boolean },
  approvals: AssetApprovalRecord[],
  filter: SkillLifecycleFilter,
): boolean {
  if (filter === 'all') return true;
  return resolveSkillLifecycleStatus(skill, approvals) === filter;
}
