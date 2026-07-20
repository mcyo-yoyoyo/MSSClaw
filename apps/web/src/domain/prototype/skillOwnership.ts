import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/** 按 Skill id 补齐归属（不改动原种子行结构） */
export const SKILL_OWNERSHIP: Record<
  string,
  {
    ownerDeptIds: DeptId[];
    ownerRegionId?: RegionId | null;
  }
> = {
  'skill-data-analysis': { ownerDeptIds: ['gtm', 'channel'], ownerRegionId: 'latam' },
  'skill-doc-gen': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-doc-compliance': { ownerDeptIds: ['mkt', 'quality'], ownerRegionId: 'europe' },
  'skill-file-archive': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-ppt-gen': { ownerDeptIds: ['mkt', 'gtm'], ownerRegionId: 'latam' },
  'skill-meeting-minutes': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-work-summary': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-doc-parser': { ownerDeptIds: ['mkt', 'quality'], ownerRegionId: null },
  'skill-launch-sentiment': { ownerDeptIds: ['mkt', 'service'], ownerRegionId: 'europe' },
  'skill-survey-insight': { ownerDeptIds: ['mkt'], ownerRegionId: null },
  'skill-review-collect': { ownerDeptIds: ['ecommerce', 'service'], ownerRegionId: 'apac' },
  'skill-review-translate': { ownerDeptIds: ['ecommerce', 'mkt', 'service'], ownerRegionId: 'apac' },
  'skill-review-cluster': { ownerDeptIds: ['ecommerce', 'service'], ownerRegionId: 'apac' },
  'skill-retail-insight': { ownerDeptIds: ['retail'], ownerRegionId: 'latam' },
  'skill-price-monitor': { ownerDeptIds: ['gtm', 'channel', 'ecommerce'], ownerRegionId: 'latam' },
  'skill-so-report': { ownerDeptIds: ['gtm', 'channel'], ownerRegionId: 'mea' },
  'skill-jd-parser': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-resume-screen': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-interview-analysis': { ownerDeptIds: ['hr'], ownerRegionId: null },
  'skill-training-gen': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-rag': { ownerDeptIds: ['service', 'quality'], ownerRegionId: null },
  'skill-rerank': { ownerDeptIds: ['service'], ownerRegionId: null },
  'skill-retail-coach': { ownerDeptIds: ['retail'], ownerRegionId: 'apac' },
  'skill-complaint-sop': { ownerDeptIds: ['service'], ownerRegionId: 'eurasia' },
  'skill-wecom': { ownerDeptIds: ['hr', 'service'], ownerRegionId: null },
};

export function withSkillOwnership(skills: PrototypeSkillSeed[]): PrototypeSkillSeed[] {
  return skills.map((s) => {
    const own = SKILL_OWNERSHIP[s.id];
    return {
      ...s,
      sourceType: s.sourceType ?? 'internal',
      visibility: s.visibility ?? 'public',
      ownerDeptIds: s.ownerDeptIds ?? own?.ownerDeptIds,
      ownerRegionId: s.ownerRegionId ?? own?.ownerRegionId ?? null,
    };
  });
}
