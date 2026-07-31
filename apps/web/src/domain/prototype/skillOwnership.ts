import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/**
 * Skill 所属职能：每个技能只挂一个领域，避免做任务橱窗出现多职能标签造成误会。
 * 业务场景篮子（S1/S2…）仍可单独配置，与职能无关。
 */
export const SKILL_OWNERSHIP: Record<
  string,
  {
    ownerDeptIds: [DeptId];
    ownerRegionId?: RegionId | null;
  }
> = {
  'skill-data-analysis': { ownerDeptIds: ['gtm'], ownerRegionId: null },
  'skill-doc-gen': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-doc-compliance': { ownerDeptIds: ['quality'], ownerRegionId: 'europe' },
  'skill-file-archive': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-ppt-gen': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-meeting-minutes': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-work-summary': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-doc-parser': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-launch-sentiment': { ownerDeptIds: ['mkt'], ownerRegionId: 'europe' },
  'skill-survey-insight': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-review-collect': { ownerDeptIds: ['ecommerce'], ownerRegionId: 'apac' },
  'skill-review-translate': { ownerDeptIds: ['ecommerce'], ownerRegionId: 'apac' },
  'skill-review-cluster': { ownerDeptIds: ['ecommerce'], ownerRegionId: 'apac' },
  'skill-retail-insight': { ownerDeptIds: ['retail'], ownerRegionId: 'latam' },
  'skill-price-monitor': { ownerDeptIds: ['gtm'], ownerRegionId: null },
  'skill-so-report': { ownerDeptIds: ['gtm'], ownerRegionId: null },
  'skill-jd-parser': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-resume-screen': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-interview-analysis': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-training-gen': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-rag': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-rerank': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-retail-coach': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-complaint-sop': { ownerDeptIds: ['service'], ownerRegionId: 'eurasia' },
  'skill-wecom': { ownerDeptIds: ['service'], ownerRegionId: null },
};

/** 所属职能只保留一个（取首项） */
export function singleOwnerDeptIds(depts: DeptId[] | undefined): DeptId[] | undefined {
  if (!depts?.length) return undefined;
  return [depts[0]!];
}

export function withSkillOwnership(skills: PrototypeSkillSeed[]): PrototypeSkillSeed[] {
  return skills.map((s) => {
    const own = SKILL_OWNERSHIP[s.id];
    return {
      ...s,
      sourceType: s.sourceType ?? 'internal',
      // 默认组织内可见：能力开发仅见公开 + 本组织，避免种子全量 public 穿透
      visibility: s.visibility ?? 'org',
      // 有种子表时以种子为准（单职能）；否则把已有多选压成一个
      ownerDeptIds: own ? [...own.ownerDeptIds] : singleOwnerDeptIds(s.ownerDeptIds),
      ownerRegionId: own
        ? (own.ownerRegionId ?? null)
        : (s.ownerRegionId ?? null),
    };
  });
}
