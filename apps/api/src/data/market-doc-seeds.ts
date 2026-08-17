/**
 * 市场页面筛选与场景配置的后端初始数据。
 *
 * 前端只读取平台文档接口；这些值仅在工作区首次创建相应文档时写入数据库。
 * 后续运营修改均以数据库中的文档为准。
 */
export const SEED_EXTERNAL_TAXONOMY = {
  version: 2,
  types: [
    { id: 'general', label: '通用AI助手', csvLabel: '通用AI助手', icon: 'fa-comments', visible: true, filterTypeIds: ['general'] },
    { id: 'search', label: 'AI搜索与研究', csvLabel: 'AI搜索与研究', icon: 'fa-magnifying-glass', visible: true, filterTypeIds: ['search'] },
    { id: 'knowledge', label: '知识管理与写作', csvLabel: '知识管理与写作', icon: 'fa-book', visible: true, filterTypeIds: ['knowledge', 'writing'] },
    { id: 'ppt', label: '演示与文档', csvLabel: '演示与文档', icon: 'fa-file-powerpoint', visible: true, filterTypeIds: ['ppt'] },
    { id: 'image', label: '图像与设计', csvLabel: '图像与设计', icon: 'fa-image', visible: true, filterTypeIds: ['image'] },
    { id: 'video', label: '视频与数字人', csvLabel: '视频与数字人', icon: 'fa-video', visible: true, filterTypeIds: ['video'] },
    { id: 'audio', label: '音频与语音', csvLabel: '音频与语音', icon: 'fa-microphone', visible: true, filterTypeIds: ['audio'] },
    { id: 'meeting', label: '会议与协作', csvLabel: '会议与协作', icon: 'fa-users', visible: true, filterTypeIds: ['meeting'] },
    { id: 'code', label: '编程开发', csvLabel: '编程开发', icon: 'fa-code', visible: true, filterTypeIds: ['code'] },
    { id: 'agent', label: '智能体', csvLabel: '智能体', icon: 'fa-robot', visible: true, filterTypeIds: ['agent'] },
    { id: 'writing', label: '写作与翻译', csvLabel: '写作与翻译', icon: 'fa-pen', visible: false, filterTypeIds: ['writing'] },
    { id: 'data', label: '数据分析', csvLabel: '数据分析', icon: 'fa-chart-line', visible: false, filterTypeIds: ['data'] },
  ],
  scenes: [
    { id: 'office', label: '日常办公', icon: 'fa-briefcase', visible: true, typeIds: ['general', 'ppt', 'meeting', 'writing'] },
    { id: 'search', label: '搜索研究', icon: 'fa-magnifying-glass', visible: true, typeIds: ['search'] },
    { id: 'knowledge', label: '知识学习', icon: 'fa-book', visible: true, typeIds: ['knowledge'] },
    { id: 'writing', label: '写作翻译', icon: 'fa-pen', visible: true, typeIds: ['writing'] },
    { id: 'ppt', label: 'PPT制作', icon: 'fa-file-powerpoint', visible: true, typeIds: ['ppt'] },
    { id: 'media', label: '图片·视频·音频', icon: 'fa-photo-film', visible: true, typeIds: ['image', 'video', 'audio'] },
    { id: 'meeting', label: '会议协作', icon: 'fa-users', visible: true, typeIds: ['meeting'] },
    { id: 'data', label: '数据分析', icon: 'fa-chart-line', visible: true, typeIds: ['data'] },
    { id: 'code', label: '编程开发', icon: 'fa-code', visible: true, typeIds: ['code'] },
    { id: 'agent', label: 'Agent 执行', icon: 'fa-robot', visible: true, typeIds: ['agent'] },
  ],
};

export const SEED_INTERNAL_OFFICE_SCENES = {
  version: 2,
  entries: [
  {
    id: 'capture', label: '录音及纪要用云笔记', english: 'CAPTURE',
    description: '自动记录会议、转写发言并提炼结论与行动项，让会后跟进立即开始。', icon: 'fa-pen-to-square',
    visible: true, toolIds: ['tool-hw-cloudnote'], toolBlurbs: { 'tool-hw-cloudnote': '写报告与会议纪要' },
  },
  {
    id: 'read', label: '文档解析用员工助手读一下', english: 'READ',
    description: '快速读懂文档与报告，提炼观点、数据、风险和可行动信息。', icon: 'fa-book-open',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  {
    id: 'write', label: '写作及总结用员工助手写一下', english: 'WRITE',
    description: '基于已有信息生成日报、周报、月报与工作总结，并持续润色。', icon: 'fa-file-lines',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  {
    id: 'ask', label: '问答与任务处理用员工助手', english: 'ASK',
    description: '不仅回答问题，还能执行任务。支持多模型动态适配（DeepSeek-R1、Qwen3等），可调用技能（Skill）完成PPT生成、文档校验、邮件编写、方案输出等。', icon: 'fa-comments',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  {
    id: 'search', label: '信息查找用W3智能搜索', english: 'SEARCH',
    description: '专注信息检索与知识获取。将传统搜索从“给链接列表”升级为“直接给答案”，整合W3发文、3MS、iLearning、文档库、社区资源等全量企业知识。', icon: 'fa-magnifying-glass',
    visible: true, toolIds: ['tool-hw-w3-qa'], toolBlurbs: { 'tool-hw-w3-qa': '查制度与内部入口' },
  },
  {
    id: 'specialist', label: '专项问答用小鲁班', english: 'SPECIALIST',
    description: '以WeLink对话为入口，提供自定义办公功能 + AI对话。支持私聊、群聊等。', icon: 'fa-screwdriver-wrench',
    visible: true, toolIds: ['tool-hw-xiaoluban'], toolBlurbs: { 'tool-hw-xiaoluban': '专项业务答疑' },
  },
  {
    id: 'intel', label: '咨询信息追踪用员工助手情报官', english: 'INTELLIGENCE',
    description: '围绕关注主题自动监测、筛选和研判，让信息从人找变成主动送。', icon: 'fa-binoculars',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  {
    id: 'knowledge', label: '知识库及问答用员工助手', english: 'KNOWLEDGE',
    description: '建设个人、团队与组织知识库，通过 AI 问答让沉淀的资料真正被使用。', icon: 'fa-database',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  {
    id: 'agent', label: '任务处理用员工助手', english: 'EXECUTE',
    description: '以大语言模型为核心，内置文档处理、数据分析、会议纪要、消息邮件、知识搜索等多Agent技能，通过自然语言即可自动调度多技能协同完成任务。', icon: 'fa-robot',
    visible: true, toolIds: ['tool-hw-assistant'], toolBlurbs: { 'tool-hw-assistant': '个人日常 Skill' },
  },
  ],
};

export const SEED_BUSINESS_SCENARIO_CATALOG = {
  categories: [
    { id: 'S1', label: '市场洞察', fullLabel: '市场与竞争洞察', icon: 'fa-chart-line', blurb: '竞品、价格、舆情与市场情报', tabVisible: true },
    { id: 'S2', label: '内容生成', fullLabel: '内容生成与调优', icon: 'fa-pen-nib', blurb: '文案、本地化、培训内容与活动物料', tabVisible: true },
    { id: 'S3', label: '销售赋能', fullLabel: '销售赋能与转化', icon: 'fa-handshake', blurb: '线索、话术陪练与成交辅助', tabVisible: true },
    { id: 'S5', label: '客户服务', fullLabel: '客户服务与运营', icon: 'fa-headset', blurb: '客服、工单与满意度运营', tabVisible: true },
    { id: 'S8', label: '数据分析', fullLabel: '数据分析与报表洞察', icon: 'fa-chart-column', blurb: '多源分析、SO/SI 报表与经营归因', tabVisible: true },
    { id: 'S4', label: '合规结算', fullLabel: '合规筛查与结算对账', icon: 'fa-scale-balanced', blurb: '合规筛查、对账结算与核验', tabVisible: true },
    { id: 'S6', label: '知识问答', fullLabel: '企业知识检索与问答', icon: 'fa-book-open', blurb: '制度案例检索、知识问答与复用', tabVisible: true },
    { id: 'S7', label: '日常办公', fullLabel: '日常办公与协作提效', icon: 'fa-briefcase', blurb: '会议纪要、工作总结、招聘与归档', tabVisible: true },
  ],
};

/** 旧目录缺少显式场景字段时，由后端一次性补齐并回写 marketplace 快照。 */
export const MARKET_SKILL_BUSINESS_SCENARIO: Record<string, string> = {
  'skill-data-analysis': 'S8',
  'skill-doc-gen': 'S2',
  'skill-doc-compliance': 'S4',
  'skill-file-archive': 'S6',
  'skill-ppt-gen': 'S2',
  'skill-meeting-minutes': 'S7',
  'skill-work-summary': 'S7',
  'skill-doc-parser': 'S7',
  'skill-launch-sentiment': 'S1',
  'skill-survey-insight': 'S1',
  'skill-review-collect': 'S1',
  'skill-review-translate': 'S2',
  'skill-review-cluster': 'S1',
  'skill-retail-insight': 'S1',
  'skill-price-monitor': 'S1',
  'skill-so-report': 'S8',
  'skill-jd-parser': 'S7',
  'skill-resume-screen': 'S7',
  'skill-interview-analysis': 'S7',
  'skill-training-gen': 'S3',
  'skill-rag': 'S6',
  'skill-rerank': 'S6',
  'skill-retail-coach': 'S3',
  'skill-complaint-sop': 'S5',
  'skill-wecom': 'S5',
};

export const MARKET_AGENT_BUSINESS_SCENARIO: Record<string, string> = {
  'agent-marketing': 'S8',
  'agent-data-analysis': 'S8',
  'agent-doc-review': 'S4',
  'agent-file-organize': 'S7',
  'agent-ppt': 'S2',
  'agent-meeting': 'S7',
  'agent-launch-sentiment': 'S1',
  'agent-survey': 'S1',
  'agent-review-collect': 'S1',
  'agent-review-translate': 'S2',
  'agent-review': 'S1',
  'agent-retail-insight': 'S1',
  'agent-price-monitor': 'S1',
  'agent-hr-resume': 'S7',
  'agent-training': 'S3',
  'agent-knowledge': 'S6',
  'agent-retail-coach': 'S3',
};
