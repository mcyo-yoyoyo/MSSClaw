import type { PrototypeSkillSeed } from '@/domain/prototype/types';

const CJK_RE = /[\u4e00-\u9fff]/;

/** 种子 Skill 的中文展示名（英文 name 保留作技术名） */
export const SKILL_NAME_ZH_BY_ID: Record<string, string> = {
  'skill-data-analysis': '多源数据分析',
  'skill-doc-gen': '文档初稿生成',
  'skill-doc-compliance': '文档合规筛查',
  'skill-file-archive': '智能文件归档',
  'skill-ppt-gen': 'PPT 自动生成',
  'skill-meeting-minutes': '会议纪要生成',
  'skill-work-summary': '个人工作总结',
  'skill-doc-parser': '文档解析',
  'skill-launch-sentiment': '发布会舆情快报',
  'skill-survey-insight': '问卷洞察分析',
  'skill-review-collect': '评分采集',
  'skill-review-translate': '评论语种翻译',
  'skill-review-cluster': '订单评论分析',
  'skill-retail-insight': '零售信息洞察',
  'skill-price-monitor': '价格与 Offer 监测',
  'skill-so-report': 'SO/SI 报表',
  'skill-jd-parser': 'JD 解析',
  'skill-resume-screen': '简历筛选',
  'skill-interview-analysis': '面试分析',
  'skill-training-gen': '培训内容生成',
  'skill-rag': '企业知识检索',
  'skill-rerank': '检索重排序',
  'skill-retail-coach': '零售 AI 陪练',
  'skill-complaint-sop': '客诉 SOP 匹配',
  'skill-wecom': '企微消息推送',
  'skill-l10n-localize': '小语种本地化翻译',
  'skill-sales-copy': '卖点文案写作',
  'skill-frontline-script': '一线统一话术',
  'skill-knowledge-digest': '组织知识沉淀',
  'skill-weekly-report': '经营分析周报',
  'skill-comp-brief': '竞品简报',
  'skill-channel-brief': '渠道作战简报',
  'skill-email-draft': '商务邮件草稿',
};

function hasCjk(text?: string | null): boolean {
  return Boolean(text && CJK_RE.test(text));
}

type SkillNameFields = Pick<
  PrototypeSkillSeed,
  'id' | 'name' | 'nameZh' | 'nameEn' | 'command'
>;

/** 列表/卡片默认展示中文名 */
export function skillDisplayName(skill: SkillNameFields): string {
  const explicit = skill.nameZh?.trim();
  if (explicit) return explicit;

  const byId = skill.id ? SKILL_NAME_ZH_BY_ID[skill.id] : undefined;
  if (byId) return byId;

  if (hasCjk(skill.name)) return skill.name.trim();

  const fromCmd = (skill.command || '').replace(/^\//, '').trim();
  if (hasCjk(fromCmd)) return fromCmd;

  return (skill.name || skill.nameEn || '未命名技能').trim();
}

/** 英文技术名（有中文主标题时作副标题） */
export function skillTechnicalName(skill: SkillNameFields): string | undefined {
  const display = skillDisplayName(skill);
  const en = skill.nameEn?.trim();
  if (en && en !== display) return en;
  const raw = skill.name?.trim();
  if (raw && raw !== display && !hasCjk(raw)) return raw;
  return undefined;
}

/** 列表/卡片默认展示中文描述 */
export function skillDisplayDesc(
  skill: Pick<PrototypeSkillSeed, 'desc' | 'descZh' | 'descEn'>,
): string {
  return (skill.descZh || skill.desc || skill.descEn || '').trim();
}

/** 保存时同步主字段 name/desc = 中文（兼容旧读取路径） */
export function syncSkillZhPrimary<T extends PrototypeSkillSeed>(skill: T): T {
  const nameZh = (skill.nameZh || skillDisplayName(skill) || '').trim();
  const descZh = (skill.descZh || skill.desc || '').trim();
  return {
    ...skill,
    nameZh,
    descZh,
    name: nameZh || (skill.nameEn || skill.name || '').trim(),
    desc: descZh || (skill.descEn || skill.desc || '').trim(),
  };
}

/** 为种子 Skill 补齐 nameZh / nameEn，不改动已有显式配置 */
export function withSkillDisplayNames<T extends PrototypeSkillSeed>(skill: T): T {
  const nameZh = skill.nameZh?.trim() || SKILL_NAME_ZH_BY_ID[skill.id] || undefined;
  const nameEn =
    skill.nameEn?.trim() ||
    (skill.name && !hasCjk(skill.name) ? skill.name.trim() : undefined);
  if (!nameZh && !nameEn) return skill;
  return {
    ...skill,
    ...(nameZh ? { nameZh } : {}),
    ...(nameEn ? { nameEn } : {}),
  };
}
