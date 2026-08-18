import {
  getBusinessScenarioMeta,
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/**
 * Skill → 主业务场景（AI任务推荐 / 广场同词）
 * 与 DISCOVER_TO_BUSINESS_SCENARIO 口径对齐；一 Skill 只挂一个主篮子。
 *
 * Skill Hub 精选侧重「可编排原子能力」；与 Agent Hub 案例包重复的监测/评论链路/
 * 门店陪练/招聘链路默认不进精选（仍 published，配置 Skill / Agent 可调用）。
 */
export const SKILL_TO_BUSINESS_SCENARIO: Record<string, BusinessScenarioId> = {
  // S1 市场洞察（轻量洞察；价监/评论链路归 Agent Hub）
  'skill-comp-brief': 'S1',
  'skill-launch-sentiment': 'S1',
  'skill-survey-insight': 'S1',
  'skill-retail-insight': 'S1',
  'skill-price-monitor': 'S1',
  'skill-review-collect': 'S1',
  'skill-review-cluster': 'S1',

  // S2 内容生成（承接原 Agent 小语种本地化）
  'skill-l10n-localize': 'S2',
  'skill-sales-copy': 'S2',
  'skill-review-translate': 'S2',
  'skill-ppt-gen': 'S2',
  'skill-doc-gen': 'S2',

  // S3 销售赋能（渠道简报；门店陪练/培训归 Agent Hub）
  'skill-channel-brief': 'S3',
  'skill-retail-coach': 'S3',
  'skill-training-gen': 'S3',

  // S4 合规结算
  'skill-doc-compliance': 'S4',

  // S5 客户服务（承接原客诉与一线话术）
  'skill-complaint-sop': 'S5',
  'skill-frontline-script': 'S5',
  'skill-wecom': 'S5',

  // S6 知识问答（承接组织/个人知识沉淀）
  'skill-rag': 'S6',
  'skill-knowledge-digest': 'S6',
  'skill-file-archive': 'S6',
  'skill-rerank': 'S6',

  // S8 数据分析（承接经营分析与 SO 报表）
  'skill-data-analysis': 'S8',
  'skill-so-report': 'S8',
  'skill-weekly-report': 'S8',

  // S7 日常办公
  'skill-meeting-minutes': 'S7',
  'skill-work-summary': 'S7',
  'skill-email-draft': 'S7',
  'skill-doc-parser': 'S7',
  'skill-jd-parser': 'S7',
  'skill-resume-screen': 'S7',
  'skill-interview-analysis': 'S7',
};

/**
 * Skill Hub 精选序：迁入的场景能力 + 营销服/通用办公真实 Skill。
 * 与 Agent Hub 保留案例（价监/评论/陪练/招聘/综履）去重。
 */
export const HOME_BUSINESS_SKILLS: Record<BusinessScenarioId, string[]> = {
  S1: [
    'skill-comp-brief',
    'skill-launch-sentiment',
    'skill-survey-insight',
    'skill-retail-insight',
  ],
  S2: [
    'skill-l10n-localize',
    'skill-sales-copy',
    'skill-ppt-gen',
    'skill-doc-gen',
  ],
  S3: ['skill-channel-brief'],
  S4: ['skill-doc-compliance'],
  S5: ['skill-complaint-sop', 'skill-frontline-script', 'skill-wecom'],
  S6: [
    'skill-rag',
    'skill-knowledge-digest',
    'skill-file-archive',
    'skill-rerank',
  ],
  S8: ['skill-data-analysis', 'skill-so-report', 'skill-weekly-report'],
  S7: [
    'skill-meeting-minutes',
    'skill-work-summary',
    'skill-email-draft',
    'skill-doc-parser',
  ],
};

/** AI任务 ·「今天可以试试」场景卡（点选填入输入框） */
export const TRY_TODAY_SCENARIOS = [
  {
    id: 'try-ask-data',
    businessId: 'S8' as BusinessScenarioId,
    icon: 'fa-chart-line',
    title: '经营问数',
    subtitle: 'SO / 环比洞察',
    prompt: '/数据分析 请输出近一周代表处 SO 环比与异动归因',
  },
  {
    id: 'try-l10n',
    businessId: 'S2' as BusinessScenarioId,
    icon: 'fa-language',
    title: '小语种本地化',
    subtitle: '卖点卡翻译质检',
    prompt: '/本地化翻译 将以下卖点卡译为阿语并输出术语质检清单',
  },
  {
    id: 'try-sop',
    businessId: 'S5' as BusinessScenarioId,
    icon: 'fa-headset',
    title: '客诉话术',
    subtitle: 'SOP + 一线口径',
    prompt: '/客诉 电池过热客诉请给出 SOP 步骤与一线统一话术',
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
 * 是否精选露出到「AI工具Hub · 场景技能」：
 * - 显式 featuredInMssMarket（优先）
 * - 显式 featuredInDoTask（兼容旧字段）
 * - 未设置时回退 HOME_BUSINESS_SKILLS 静态精选
 */
export function resolveSkillFeaturedInDoTask(skill: PrototypeSkillSeed): boolean {
  if (typeof skill.featuredInMssMarket === 'boolean') return skill.featuredInMssMarket;
  if (typeof skill.featuredInDoTask === 'boolean') return skill.featuredInDoTask;
  return Object.values(HOME_BUSINESS_SKILLS).some((ids) => ids.includes(skill.id));
}

/** @alias resolveSkillFeaturedInDoTask — MSS 场景技能露出 */
export const resolveSkillFeaturedInMssMarket = resolveSkillFeaturedInDoTask;

export function getSkillBusinessLabel(
  skillOrId: string | Pick<PrototypeSkillSeed, 'id' | 'businessScenarioId'>,
): string | null {
  const id =
    typeof skillOrId === 'string'
      ? getSkillBusinessScenario(skillOrId)
      : resolveSkillBusinessScenario(skillOrId);
  if (!id) return null;
  return getBusinessScenarioMeta(id).label;
}

function staticFeaturedIdsForBusiness(businessId: BusinessScenarioId | 'all'): string[] {
  if (businessId !== 'all') {
    return [...(HOME_BUSINESS_SKILLS[businessId] ?? [])];
  }
  const buckets = listVisibleBusinessScenarioCategories()
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

/** 做任务 / MSS 场景技能：能力上架 + 精选露出 */
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
