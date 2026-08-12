import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/**
 * Skill 所属职能：每个技能只挂一个领域。
 * 业务场景篮子（S1/S2…）另配，与职能无关。
 * GTM 做任务精选对齐演示账号 Dickson（gtm · apac）。
 */
export const SKILL_OWNERSHIP: Record<
  string,
  {
    ownerDeptIds: [DeptId];
    ownerRegionId?: RegionId | null;
  }
> = {
  'skill-data-analysis': { ownerDeptIds: ['gtm'], ownerRegionId: 'apac' },
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
  'skill-price-monitor': { ownerDeptIds: ['gtm'], ownerRegionId: 'apac' },
  'skill-so-report': { ownerDeptIds: ['gtm'], ownerRegionId: 'apac' },
  'skill-jd-parser': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-resume-screen': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-interview-analysis': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-training-gen': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-rag': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-rerank': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-retail-coach': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-complaint-sop': { ownerDeptIds: ['service'], ownerRegionId: 'eurasia' },
  'skill-wecom': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-l10n-localize': { ownerDeptIds: ['mkt'], ownerRegionId: 'mea' },
  'skill-sales-copy': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-frontline-script': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-knowledge-digest': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-weekly-report': { ownerDeptIds: ['gtm'], ownerRegionId: 'apac' },
  'skill-comp-brief': { ownerDeptIds: ['gtm'], ownerRegionId: 'apac' },
  'skill-channel-brief': { ownerDeptIds: ['channel'], ownerRegionId: 'china' },
  'skill-email-draft': { ownerDeptIds: ['mkt'], ownerRegionId: null },
};

/** 所属职能只保留一个（取首项） */
export function singleOwnerDeptIds(depts: DeptId[] | undefined): DeptId[] | undefined {
  if (!depts?.length) return undefined;
  return [depts[0]!];
}

export function withSkillOwnership(skills: PrototypeSkillSeed[]): PrototypeSkillSeed[] {
  return skills.map((s) => applyCanonicalSkillOwnership(s));
}

/**
 * 合并 localStorage/API 后再次校准：已知种子 id 强制单职能+区域，避免脏缓存「全员可见」。
 */
export function applyCanonicalSkillOwnership(skill: PrototypeSkillSeed): PrototypeSkillSeed {
  const own = SKILL_OWNERSHIP[skill.id];
  if (own) {
    const region = own.ownerRegionId ?? null;
    return {
      ...skill,
      sourceType: skill.sourceType ?? 'internal',
      visibility: 'org',
      ownerDeptIds: [...own.ownerDeptIds],
      ownerRegionId: region,
      // 清掉历史多区域缓存，避免 ownerRegionIds=['latam'] 盖住 ownerRegionId=apac
      ownerRegionIds: region ? [region] : [],
      // 未显式关精选时，交给 HOME_BUSINESS_SKILLS 静态表判断
      featuredInDoTask:
        typeof skill.featuredInDoTask === 'boolean' ? skill.featuredInDoTask : undefined,
      featuredInMssMarket:
        typeof skill.featuredInMssMarket === 'boolean' ? skill.featuredInMssMarket : undefined,
      published: skill.published !== false,
    };
  }
  const region = skill.ownerRegionId ?? null;
  return {
    ...skill,
    sourceType: skill.sourceType ?? 'internal',
    visibility: skill.visibility ?? 'org',
    ownerDeptIds: singleOwnerDeptIds(skill.ownerDeptIds),
    ownerRegionId: region,
    ownerRegionIds:
      Array.isArray(skill.ownerRegionIds) && skill.ownerRegionIds.length > 0
        ? [skill.ownerRegionIds[0]!]
        : region
          ? [region]
          : [],
  };
}

export function applyCanonicalSkillOwnershipList(
  skills: PrototypeSkillSeed[],
): PrototypeSkillSeed[] {
  return skills.map(applyCanonicalSkillOwnership);
}
