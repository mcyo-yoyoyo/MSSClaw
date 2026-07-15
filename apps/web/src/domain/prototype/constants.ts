import type { EfficiencyCategory } from '@/domain/prototype/types';

export const MARKET_VERSION = 'v9-home-ux-polish';
export const KB_VERSION = 'v2-biz-dept';
export const TASK_SESSIONS_VERSION = 'v2-no-default-warroom';
export const PORTAL_CONTENT_VERSION = 'v1-ops-portal';

/** 设计稿默认工作区 ID */
export const PROTOTYPE_WORKSPACE_ID = 'ws-cn-marketing';

export const EFFICIENCY_LABELS: Record<EfficiencyCategory, string> = {
  office: '办公提效',
  manage: '管理提效',
  process: '流程提效',
  experience: '体验提升',
};

export function getEfficiencyLabel(cat: EfficiencyCategory | string): string {
  return EFFICIENCY_LABELS[cat as EfficiencyCategory] ?? cat;
}
