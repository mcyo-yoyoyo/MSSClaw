import type { AssetVisibility, DeptId, PortalAssetType, RegionId } from '@/domain/orgTaxonomy';

/** 案例在线预览附件（演示态以 dataUrl 持久化，建议 ≤3MB） */
export interface PortalCasePreviewFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  kind: 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'image' | 'other';
}

/** 门户知识地图内容（场景案例 / 培训 / 前沿洞察） */
export interface PortalContentItem {
  id: string;
  type: Extract<PortalAssetType, 'case' | 'insight' | 'training' | 'news'>;
  title: string;
  desc: string;
  icon: string;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  publisher?: string;
  publisherUserId?: string;
  sourceType?: 'internal' | 'external';
  visibility?: AssetVisibility;
  homepageUrl?: string;
  /** 关联平台资产，点击时优先跳转 */
  kbDocId?: string;
  agentId?: string;
  skillId?: string;
  /** 优先调用的 Skill（缺省回落 skillId） */
  primarySkillId?: string;
  toolId?: string;
  publishedAt: string;
  scenarioTags?: string[];
  /** 运营上架；缺省 true */
  published?: boolean;
  /** 业务痛点（成效卡） */
  painPoint?: string;
  /** 提效/业务指标（成效卡） */
  impactMetric?: string;
  /** 打样三步走 */
  steps?: string[];
  /** 金案例：样板间重点演示 */
  isGold?: boolean;
  /** 包版本（导出/再导入） */
  packageVersion?: string;
  /** 在线预览附件（PPT / PDF / Office） */
  previewFile?: PortalCasePreviewFile | null;
}

export const PORTAL_CONTENT_TYPE_LABELS: Record<PortalContentItem['type'], string> = {
  case: '场景案例',
  /** 历史类型，展示并入「前沿洞察」 */
  insight: '前沿洞察',
  training: '培训赋能',
  news: '前沿洞察',
};

/** 门户运营可新建/筛选的类型（不含已合并的 insight） */
export const PORTAL_OPS_TYPE_OPTIONS: PortalContentItem['type'][] = [
  'case',
  'training',
  'news',
];

export const PROTOTYPE_PORTAL_CONTENT: PortalContentItem[] = [
  {
    id: 'portal-case-latam-price',
    type: 'case',
    title: '拉美价监 Agent 落地案例',
    desc: '拉美区用价格监测 Agent + 外部价盘哨兵，周级异动闭环从 2 天缩到 4 小时',
    icon: 'fa-lightbulb',
    ownerDeptIds: ['gtm', 'channel'],
    ownerRegionId: 'latam',
    publisher: 'Jacky',
    publisherUserId: 'm3',
    agentId: 'agent-price-monitor',
    skillId: 'skill-price-monitor',
    primarySkillId: 'skill-price-monitor',
    toolId: 'tool-ext-latam-price',
    publishedAt: '2026-07-10',
    scenarioTags: ['价格监测', '区域自建', 'offer', '价格'],
    visibility: 'org',
    kbDocId: 'kb-offer-monitor',
    isGold: true,
    packageVersion: '1.0.0',
    painPoint: '18 国商城价盘分散，人工巡检周级异动要 2 天，调价窗口常错过。',
    impactMetric: '异动闭环 2 天 → 4 小时；周报人工工时 −70%',
    steps: [
      '打开本案例 → 调用「价格监测」金牌 Skill',
      '确认监测国家/渠道并生成异动清单',
      '导出调价建议，同步 GTM/渠道 Owner',
    ],
  },
  {
    id: 'portal-case-apac-voc',
    type: 'case',
    title: '亚太电渠评论分析样板间',
    desc: '评分采集 Agent → 语种翻译 Agent（中英）→ 评论分析 Agent，三段式产出差评周报与行动建议',
    icon: 'fa-comments',
    ownerDeptIds: ['ecommerce', 'service'],
    ownerRegionId: 'apac',
    publisher: 'MSS AI变革',
    agentId: 'agent-review',
    skillId: 'skill-review-cluster',
    primarySkillId: 'skill-review-cluster',
    toolId: 'tool-ext-apac-review',
    kbDocId: 'kb-campaign-q3',
    publishedAt: '2026-07-14',
    scenarioTags: ['评论分析', '评论', '电商'],
    visibility: 'org',
    isGold: true,
    packageVersion: '1.1.0',
    painPoint: '多站点评论散落各后台：采集难、语种杂、人工情感归纳慢，难支撑周级改进。',
    impactMetric: '采集→翻译→分析全链路从 1.5 天 → 30 分钟；差评响应 SLA 达成率 +22%',
    steps: [
      '① 评分采集 Agent（/评论采集）：拉取 Amazon 等 3C 购买页订单评论',
      '② 语种翻译 Agent（/评论翻译）：多语种统一译为英语与中文，保留原文',
      '③ 评论分析 Agent（/评论分析）：情感判断、用户数据挖掘并导出周报',
    ],
  },
  {
    id: 'portal-case-eu-compliance',
    type: 'case',
    title: '欧洲营销物料合规抽检',
    desc: '文档解读 Agent + EU Checklist 外部工具，医疗用语风险检出率提升 35%',
    icon: 'fa-shield-halved',
    ownerDeptIds: ['mkt', 'quality'],
    ownerRegionId: 'europe',
    publisher: 'Bruce',
    publisherUserId: 'm2',
    agentId: 'agent-doc-review',
    skillId: 'skill-doc-compliance',
    primarySkillId: 'skill-doc-compliance',
    toolId: 'tool-ext-eu-compliance',
    kbDocId: 'kb-wearable-medical',
    publishedAt: '2026-07-08',
    scenarioTags: ['合规', '质量与运营', '办公提效', '平台'],
    visibility: 'org',
    isGold: true,
    packageVersion: '1.0.0',
    painPoint: '欧洲上市物料医疗用语风险靠人工抽检，漏检与返工成本高。',
    impactMetric: '风险检出率 +35%；单批次抽检周期 −50%',
    steps: [
      '打开本案例 → 调用文档合规 / 解读 Agent',
      '上传物料与 EU Checklist，确认风险清单',
      '闭环整改项并归档至知识库',
    ],
  },
  {
    id: 'portal-insight-q3-campaign',
    type: 'news',
    title: 'Q3 全渠道活动 AI 洞察摘要',
    desc: 'MKT 洞察部整理：活动节奏、预算池与开放题问卷结论一页纸',
    icon: 'fa-chart-line',
    ownerDeptIds: ['mkt'],
    ownerRegionId: null,
    publisher: 'Sarah',
    publisherUserId: 'g1',
    kbDocId: 'kb-campaign-q3',
    skillId: 'skill-survey-insight',
    publishedAt: '2026-07-09',
    scenarioTags: ['活动', '问卷', '办公提效'],
    painPoint: '活动复盘材料分散，领导层难一次看清节奏与预算结论。',
    impactMetric: '洞察一页纸产出从半天 → 30 分钟',
    steps: ['打开洞察条目', '调用问卷洞察 Skill', '导出一页纸同步 GTM'],
  },
  {
    id: 'portal-insight-apac-review',
    type: 'news',
    title: '亚太电商差评主题周报',
    desc: '采集→翻译→分析三段链路产出 + 亚太评论雷达看板联动解读',
    icon: 'fa-comments',
    ownerDeptIds: ['ecommerce', 'service'],
    ownerRegionId: 'apac',
    agentId: 'agent-review',
    skillId: 'skill-review-cluster',
    primarySkillId: 'skill-review-cluster',
    toolId: 'tool-ext-apac-review',
    publishedAt: '2026-07-11',
    scenarioTags: ['评论分析', '评论', '电商'],
    painPoint: '周报仍依赖人工拼贴看板截图，解读口径不一致。',
    impactMetric: '周报编制工时 −60%',
    steps: [
      '打开洞察，核对采集与翻译是否已完成',
      '调用评论分析 Agent（/评论分析）出主题周报',
      '对照雷达看板输出电商/服务行动项',
    ],
  },
  {
    id: 'portal-train-nova-coach',
    type: 'training',
    title: 'Nova 门店陪练赋能课',
    desc: '零售陪练：卖点演练 → AI 陪练 → 考核反馈完整路径',
    icon: 'fa-graduation-cap',
    ownerDeptIds: ['retail'],
    ownerRegionId: 'apac',
    agentId: 'agent-retail-coach',
    skillId: 'skill-retail-coach',
    primarySkillId: 'skill-retail-coach',
    kbDocId: 'kb-nova-training',
    publishedAt: '2026-07-07',
    scenarioTags: ['门店', '培训', 'Nova', '陪练'],
    painPoint: '门店卖点脚本更新慢，陪练资源不足。',
    impactMetric: '新品话术上岗周期 −40%',
    steps: ['进入培训课', '调用零售陪练 Skill', '发起陪练并查看考核'],
  },
  {
    id: 'portal-train-hr-resume',
    type: 'training',
    title: 'HR 三 Agent 协同招聘工作坊',
    desc: 'JD 解析 → 简历筛选 → 面试分析，带示例任务包',
    icon: 'fa-user-check',
    ownerDeptIds: ['hr'],
    ownerRegionId: null,
    agentId: 'agent-hr-resume',
    skillId: 'skill-resume-screen',
    kbDocId: 'kb-jd-template',
    publishedAt: '2026-07-05',
    scenarioTags: ['招聘', 'HR', '简历', '面试'],
    painPoint: '批量简历筛选与面试纪要分散在多人表格。',
    impactMetric: '单岗初筛吞吐 ×3',
    steps: ['打开工作坊', '挂载 HR Agent', '跑通示例任务包'],
  },
  {
    id: 'portal-news-ai-frontier',
    type: 'news',
    title: 'MSS AI 前沿：Agent 上架规范更新',
    desc: '机关与区域自建 Skill/外部工具登记字段、可见性与审核口径说明',
    icon: 'fa-newspaper',
    ownerDeptIds: ['quality'],
    ownerRegionId: null,
    publisher: 'MSS AI变革',
    kbDocId: 'kb-agent-playbook',
    publishedAt: '2026-07-12',
    scenarioTags: ['规范', '赋能', '平台'],
  },
  {
    id: 'portal-news-mea-so',
    type: 'news',
    title: '中东非 SO 周报自动化试点',
    desc: '数据分析 Agent + SO 报表 Skill 组合，代表处周报模板开放试用',
    icon: 'fa-table',
    ownerDeptIds: ['gtm', 'channel'],
    ownerRegionId: 'mea',
    agentId: 'agent-data-analysis',
    skillId: 'skill-so-report',
    primarySkillId: 'skill-so-report',
    toolId: 'tool-isrp',
    publishedAt: '2026-07-06',
    scenarioTags: ['SO', '代表处', '数据分析', '经营'],
  },
  {
    id: 'portal-case-service-sop',
    type: 'case',
    title: '客诉 SOP 知识 Agent 实践',
    desc: '服务条线用知识 Agent 检索电池过热 SOP，一线话术一致性提升',
    icon: 'fa-headset',
    ownerDeptIds: ['service'],
    ownerRegionId: 'eurasia',
    agentId: 'agent-knowledge',
    skillId: 'skill-complaint-sop',
    primarySkillId: 'skill-complaint-sop',
    kbDocId: 'kb-sop-complaint',
    publishedAt: '2026-07-04',
    scenarioTags: ['客诉', '服务', '工单', 'SOP'],
    painPoint: '一线检索 SOP 路径长，话术口径漂移。',
    impactMetric: '一线话术一致性抽检通过率 +18%',
    steps: [
      '打开案例 → 调用客诉 SOP Skill',
      '按场景检索电池过热话术',
      '沉淀引用规范到知识库',
    ],
  },
  {
    id: 'portal-insight-retail-pi',
    type: 'news',
    title: '零售洞察 π · 门店转化解读',
    desc: 'DOS / 转化 / 陈列合规周报样例，适配拉美与欧亚门店',
    icon: 'fa-store',
    ownerDeptIds: ['retail'],
    ownerRegionId: 'latam',
    agentId: 'agent-retail-insight',
    kbDocId: 'kb-retail-pi',
    publishedAt: '2026-07-11',
    scenarioTags: ['零售', '洞察π', '门店', '培训'],
  },
  {
    id: 'portal-train-quality-audit',
    type: 'training',
    title: '质量运营审计与 Agent 抽检培训',
    desc: '文档合规抽检、调用审计与问题闭环流程赋能课',
    icon: 'fa-clipboard-check',
    ownerDeptIds: ['quality'],
    ownerRegionId: null,
    kbDocId: 'kb-quality-audit',
    skillId: 'skill-doc-compliance',
    publishedAt: '2026-07-03',
    scenarioTags: ['审计', '质量', '合规', '平台'],
  },
  {
    id: 'portal-news-ext-tools',
    type: 'news',
    title: '外部 AI 工具精选周刊',
    desc: '整理可登记到智枢的外部看板与采集工具，本周重点：价监 / 评论 / 合规',
    icon: 'fa-link',
    ownerDeptIds: ['gtm', 'ecommerce', 'quality'],
    ownerRegionId: null,
    sourceType: 'external',
    homepageUrl: 'https://example.com/mss-ai-tool-weekly',
    publishedAt: '2026-07-13',
    scenarioTags: ['外部工具', '赋能', '平台'],
  },
  {
    id: 'portal-case-channel-rebate',
    type: 'case',
    title: '渠道返利稽核 Agent 试点',
    desc: '渠道部用数据分析 + SO 报表组合，代表处返利异常周清',
    icon: 'fa-diagram-project',
    ownerDeptIds: ['channel', 'gtm'],
    ownerRegionId: 'mea',
    agentId: 'agent-data-analysis',
    skillId: 'skill-so-report',
    primarySkillId: 'skill-so-report',
    toolId: 'tool-isrp',
    kbDocId: 'kb-rebate-q3',
    publishedAt: '2026-07-02',
    scenarioTags: ['返利', '代表处', 'SO', '数据分析', '经营'],
    painPoint: '代表处返利异常依赖月度人工对账，难以及时纠偏。',
    impactMetric: '异常周清；对账人工工时 −45%',
    steps: [
      '打开案例 → 调用 SO 报表 Skill',
      '导入本周返利明细并核对异常',
      '输出周清清单给渠道 Owner',
    ],
  },
  {
    id: 'portal-insight-russia-dos',
    type: 'news',
    title: '欧亚门店 DOS 异动解读',
    desc: '零售洞察 Agent 输出库存与转化交叉解读样例',
    icon: 'fa-chart-pie',
    ownerDeptIds: ['retail'],
    ownerRegionId: 'eurasia',
    agentId: 'agent-retail-insight',
    publishedAt: '2026-07-01',
    scenarioTags: ['零售', '洞察π', '门店'],
  },
  {
    id: 'portal-train-ppt-office',
    type: 'training',
    title: '办公提效：PPT 自动生成速成',
    desc: 'MKT/GTM 共用：多源数据驱动 PPT 生成，对接 PPT 生成 Agent 主技能',
    icon: 'fa-file-powerpoint',
    ownerDeptIds: ['mkt', 'gtm'],
    ownerRegionId: null,
    agentId: 'agent-ppt',
    skillId: 'skill-ppt-gen',
    primarySkillId: 'skill-ppt-gen',
    publishedAt: '2026-06-28',
    scenarioTags: ['办公提效', 'PPT', '平台'],
    painPoint: '汇报材料依赖人工拼页，多源数据难一次成型。',
    impactMetric: '初稿产出从半天 → 30 分钟',
    steps: [
      '进入培训课 → 调用 PPT 生成 Skill',
      '导入数据源并确认大纲',
      '导出初稿交业务 Owner 润色',
    ],
  },
  {
    id: 'portal-news-latam-launch',
    type: 'news',
    title: '拉美上市节奏 AI 协同播报',
    desc: 'GTM 与质量运营联合：准入 Checklist + 价监周报上架说明',
    icon: 'fa-rocket',
    ownerDeptIds: ['gtm', 'quality'],
    ownerRegionId: 'latam',
    kbDocId: 'kb-latam-compliance',
    publishedAt: '2026-07-12',
    scenarioTags: ['上市', '准入', '价格监测'],
  },
  {
    id: 'portal-case-hr-batch',
    type: 'case',
    title: 'HR 批量简历筛选周案例',
    desc: '用人部门 + HR：三 Agent 协同处理 200+ 简历匹配报告',
    icon: 'fa-users',
    ownerDeptIds: ['hr'],
    ownerRegionId: 'apac',
    publisher: 'RD-Team',
    publisherUserId: 'r1',
    agentId: 'agent-hr-resume',
    skillId: 'skill-jd-parser',
    primarySkillId: 'skill-resume-screen',
    kbDocId: 'kb-resume-rubric',
    publishedAt: '2026-06-30',
    scenarioTags: ['招聘', 'HR', '简历', '面试', 'JD'],
    isGold: true,
    packageVersion: '1.0.0',
    painPoint: '高峰期 200+ 简历靠人工初筛，匹配标准不统一。',
    impactMetric: '初筛吞吐 ×3；匹配报告当日交付',
    steps: [
      '打开案例 → 调用简历筛选 / JD 解析 Skill',
      '导入示例简历包并确认评分口径',
      '导出匹配报告给用人部门',
    ],
  },
  {
    id: 'portal-insight-sentiment',
    type: 'news',
    title: '欧洲发布会舆情快报样例',
    desc: '舆情快报 Agent 输出主题聚类与风险信号一页纸',
    icon: 'fa-bullhorn',
    ownerDeptIds: ['mkt', 'service'],
    ownerRegionId: 'europe',
    publisher: 'Bruce',
    publisherUserId: 'm2',
    agentId: 'agent-launch-sentiment',
    publishedAt: '2026-07-09',
    scenarioTags: ['舆情', '发布会', '平台', '办公提效'],
  },
  {
    id: 'portal-train-rag-service',
    type: 'training',
    title: '服务条线 RAG 问答赋能',
    desc: '知识 Agent 主技能 RAG：一线检索话术与引用规范（客诉 SOP 见场景案例）',
    icon: 'fa-book-open',
    ownerDeptIds: ['service'],
    ownerRegionId: null,
    agentId: 'agent-knowledge',
    skillId: 'skill-rag',
    primarySkillId: 'skill-rag',
    publishedAt: '2026-07-08',
    scenarioTags: ['客诉', 'SOP', '知识', '归档'],
    painPoint: '一线找不到带引用的标准答案，口径漂移。',
    impactMetric: '检索命中带引用答复占比提升',
    steps: [
      '进入培训课 → 调用 RAG 问答 Skill',
      '按场景提问并核对引用',
      '沉淀高频问答到知识库',
    ],
  },
];
