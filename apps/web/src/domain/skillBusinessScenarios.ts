import {
  BUSINESS_SCENARIO_CATEGORIES,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/**
 * Skill → 主业务场景（AI任务推荐 / 广场同词）
 * 与 DISCOVER_TO_BUSINESS_SCENARIO 口径对齐；一 Skill 只挂一个主篮子。
 */
export const SKILL_TO_BUSINESS_SCENARIO: Record<string, BusinessScenarioId> = {
  // S1 市场洞察
  'skill-price-monitor': 'S1',
  'skill-launch-sentiment': 'S1',
  'skill-survey-insight': 'S1',
  'skill-review-collect': 'S1',
  'skill-review-cluster': 'S1',
  'skill-retail-insight': 'S1',

  // S2 内容生成
  'skill-review-translate': 'S2',
  'skill-ppt-gen': 'S2',
  'skill-doc-gen': 'S2',

  // S3 销售赋能
  'skill-retail-coach': 'S3',
  'skill-training-gen': 'S3',

  // S4 合规结算
  'skill-doc-compliance': 'S4',

  // S5 客户服务
  'skill-complaint-sop': 'S5',
  'skill-wecom': 'S5',

  // S6 知识问答
  'skill-rag': 'S6',
  'skill-rerank': 'S6',

  // S8 数据分析
  'skill-data-analysis': 'S8',
  'skill-so-report': 'S8',

  // S7 日常办公
  'skill-jd-parser': 'S7',
  'skill-resume-screen': 'S7',
  'skill-interview-analysis': 'S7',
  'skill-meeting-minutes': 'S7',
  'skill-work-summary': 'S7',
  'skill-file-archive': 'S7',
  'skill-doc-parser': 'S7',
};

/** 各业务场景下推荐 Skill 顺序（首页展示） */
export const HOME_BUSINESS_SKILLS: Record<BusinessScenarioId, string[]> = {
  S1: [
    'skill-price-monitor',
    'skill-review-collect',
    'skill-review-cluster',
    'skill-launch-sentiment',
    'skill-retail-insight',
    'skill-survey-insight',
  ],
  S2: ['skill-review-translate', 'skill-ppt-gen', 'skill-doc-gen'],
  S3: ['skill-retail-coach', 'skill-training-gen'],
  S4: ['skill-doc-compliance'],
  S5: ['skill-complaint-sop', 'skill-wecom'],
  S6: ['skill-rag', 'skill-rerank'],
  S8: ['skill-data-analysis', 'skill-so-report'],
  S7: [
    'skill-resume-screen',
    'skill-jd-parser',
    'skill-interview-analysis',
    'skill-meeting-minutes',
    'skill-work-summary',
    'skill-file-archive',
    'skill-doc-parser',
  ],
};

/** AI任务 ·「今天可以试试」场景卡（点选填入输入框） */
export const TRY_TODAY_SCENARIOS = [
  {
    id: 'try-price',
    businessId: 'S1' as BusinessScenarioId,
    icon: 'fa-tags',
    title: '价格监测',
    subtitle: '本周竞品异动',
    prompt: '/价格监测 分析本周竞品价格异动',
  },
  {
    id: 'try-l10n',
    businessId: 'S2' as BusinessScenarioId,
    icon: 'fa-language',
    title: '多语言内容',
    subtitle: '评论/文案本地化',
    prompt: '/评论翻译 将本周电渠评论统一译为中英对照',
  },
  {
    id: 'try-training',
    businessId: 'S3' as BusinessScenarioId,
    icon: 'fa-chalkboard-user',
    title: '培训内容',
    subtitle: '门店话术与陪练',
    prompt: '/培训内容 生成门店话术并准备陪练',
  },
] as const;

export function getSkillBusinessScenario(skillId: string): BusinessScenarioId | null {
  return SKILL_TO_BUSINESS_SCENARIO[skillId] ?? null;
}

/** 解析技能所属业务场景：资产字段优先，其次静态映射 */
export function resolveSkillBusinessScenario(
  skill: Pick<PrototypeSkillSeed, 'id' | 'businessScenarioId'>,
): BusinessScenarioId | null {
  return skill.businessScenarioId ?? SKILL_TO_BUSINESS_SCENARIO[skill.id] ?? null;
}

/**
 * 是否精选露出到「做任务」：
 * - 显式 featuredInDoTask
 * - 未设置时回退 HOME_BUSINESS_SKILLS 静态精选
 */
export function resolveSkillFeaturedInDoTask(skill: PrototypeSkillSeed): boolean {
  if (typeof skill.featuredInDoTask === 'boolean') return skill.featuredInDoTask;
  return Object.values(HOME_BUSINESS_SKILLS).some((ids) => ids.includes(skill.id));
}

export function getSkillBusinessLabel(
  skillOrId: string | Pick<PrototypeSkillSeed, 'id' | 'businessScenarioId'>,
): string | null {
  const id =
    typeof skillOrId === 'string'
      ? getSkillBusinessScenario(skillOrId)
      : resolveSkillBusinessScenario(skillOrId);
  if (!id) return null;
  return BUSINESS_SCENARIO_CATEGORIES.find((c) => c.id === id)?.label ?? null;
}

function staticFeaturedIdsForBusiness(businessId: BusinessScenarioId | 'all'): string[] {
  if (businessId !== 'all') {
    return [...(HOME_BUSINESS_SKILLS[businessId] ?? [])];
  }
  const buckets = BUSINESS_SCENARIO_CATEGORIES.filter((c) => c.tabVisible)
    .map((c) => HOME_BUSINESS_SKILLS[c.id] ?? [])
    .filter((ids) => ids.length > 0);
  const out: string[] = [];
  let i = 0;
  while (true) {
    let added = false;
    for (const bucket of buckets) {
      if (i < bucket.length) {
        out.push(bucket[i]!);
        added = true;
      }
    }
    if (!added) break;
    i += 1;
  }
  return out;
}

/**
 * 做任务橱窗技能 ID：已上架 ∩ 精选露出，按静态精选序优先，再追加运营新精选。
 * @deprecated 请优先用 listFeaturedDoTaskSkillIds(skills, …)
 */
export function listRecommendedSkillIdsForBusiness(
  businessId: BusinessScenarioId | 'all',
  limit = 24,
): string[] {
  return staticFeaturedIdsForBusiness(businessId).slice(0, limit);
}

/** 做任务 · 场景技能：能力上架 + 精选露出 */
export function listFeaturedDoTaskSkillIds(
  skills: PrototypeSkillSeed[],
  businessId: BusinessScenarioId | 'all',
  limit = 24,
): string[] {
  const eligible = skills.filter(
    (s) => s.published && resolveSkillFeaturedInDoTask(s),
  );
  const byId = new Map(eligible.map((s) => [s.id, s]));
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const id of staticFeaturedIdsForBusiness(businessId)) {
    const skill = byId.get(id);
    if (!skill) continue;
    if (businessId !== 'all') {
      const scenario = resolveSkillBusinessScenario(skill);
      if (scenario !== businessId) continue;
    }
    ordered.push(id);
    seen.add(id);
    if (ordered.length >= limit) return ordered;
  }

  const extras = eligible
    .filter((s) => !seen.has(s.id))
    .filter((s) => {
      if (businessId === 'all') return true;
      return resolveSkillBusinessScenario(s) === businessId;
    })
    .sort((a, b) => b.invokes - a.invokes);

  for (const s of extras) {
    ordered.push(s.id);
    if (ordered.length >= limit) break;
  }
  return ordered;
}
