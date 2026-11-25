/**
 * [INPUT]: 读取 Skill 的多语言名称、种子 ID 和调用指令。
 * [OUTPUT]: 提供统一展示名称和历史种子的中文名。
 * [POS]: 目录查重与前端展示共用纯函数。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
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

export function hasCjk(text?: string | null): boolean {
  return Boolean(text && CJK_RE.test(text));
}

export interface SkillNameFields {
  id: string;
  name: string;
  nameZh?: string | null;
  nameEn?: string | null;
  command: string;
}

/** 列表/卡片默认展示中文名 */
export function skillDisplayName(skill: SkillNameFields): string {
  const explicit = skill.nameZh?.trim();
  if (explicit) return explicit;

  const byId = skill.id ? SKILL_NAME_ZH_BY_ID[skill.id] : undefined;
  if (typeof byId === 'string') return byId;

  if (hasCjk(skill.name)) return skill.name.trim();

  const fromCmd = (skill.command || '').replace(/^\//, '').trim();
  if (hasCjk(fromCmd)) return fromCmd;

  return (skill.name || skill.nameEn || '未命名技能').trim();
}
