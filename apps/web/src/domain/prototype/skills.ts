import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { withSkillOwnership } from '@/domain/prototype/skillOwnership';
import { getSkillPack } from '@/domain/skills/catalog';

/** 来源：index.html DEFAULT_SKILLS（Phase1 打样 23 Skill）· 正文/计划由 skill pack 注入 */
const PROTOTYPE_SKILLS_RAW: PrototypeSkillSeed[] = [
  { id: 'skill-data-analysis', name: 'MultiSourceAnalysis', desc: '【办公提效】AI 辅助数据分析 · 多源数据自动分析与可视化（可在 AI任务 /数据分析 调用）', category: 'office', command: '/数据分析', author: '华为 MSS', version: '2.0.0', connector: 'ISRP + Sandbox · 对话 Runtime', published: true, invokes: 18400, icon: 'fa-chart-line', tags: ['数据分析', 'ISRP'] },
  { id: 'skill-doc-gen', name: 'DocDraftGenerator', desc: '【办公提效】AI 辅助文档生成 · 文档初稿自动生成与解读（可在 AI任务 /文档生成 调用）', category: 'office', command: '/文档生成', author: '华为 MSS', version: '1.6.0', connector: 'Doc AI · 对话 Runtime', published: true, invokes: 9100, icon: 'fa-file-lines', tags: ['文档', '初稿'] },
  { id: 'skill-doc-compliance', name: 'DocComplianceChecker', desc: '【办公提效】AI 辅助文档解读 · 营销物料/合同/招投标合规筛查（可在 AI任务 /合规筛查 调用）', category: 'office', command: '/合规筛查', author: '华为 MSS', version: '1.4.0', connector: 'Doc AI · 对话 Runtime', published: true, invokes: 6700, icon: 'fa-file-shield', tags: ['合规', '医疗用语'] },
  { id: 'skill-file-archive', name: 'SmartFileArchive', desc: '【办公提效】AI 辅助文件整理 · 多源文件智能归档（可在 AI任务 /文件整理 调用）', category: 'office', command: '/文件整理', author: '华为 MSS', version: '1.2.0', connector: 'Onebox/Email · 对话 Runtime', published: true, invokes: 4200, icon: 'fa-folder-tree', tags: ['归档', '总结'] },
  { id: 'skill-ppt-gen', name: 'PPTAutoGenerator', desc: '【办公提效】AI 辅助 PPT 生成 · 多源数据 PPT 自动生成（可在 AI任务 /ppt 调用）', category: 'office', command: '/ppt', author: '华为 MSS', version: '1.0.0', connector: 'Office Runtime · 对话 Runtime', published: true, invokes: 3100, icon: 'fa-file-powerpoint', tags: ['PPT', '汇报'] },
  { id: 'skill-meeting-minutes', name: 'MeetingMinutesGen', desc: '【办公提效】AI 辅助会议纪要生成 · 60% AI + 40% 人工（可在 AI任务 /会议纪要 调用）', category: 'office', command: '/会议纪要', author: '华为 MSS', version: '2.1.0', connector: 'WeLink · 对话 Runtime', published: true, invokes: 12100, icon: 'fa-clipboard-list', tags: ['会议', '纪要'] },
  { id: 'skill-work-summary', name: 'WorkSummaryGen', desc: '【办公提效】个人工作总结 Markdown/HTML 多形式生成（可在 AI任务 /工作总结 调用）', category: 'office', command: '/工作总结', author: '华为 MSS', version: '1.3.0', connector: '员工助手 · 对话 Runtime', published: true, invokes: 5800, icon: 'fa-file-pen', tags: ['总结', '归档'] },
  { id: 'skill-doc-parser', name: 'DocParser', desc: 'PDF/Excel/PPT 结构化解析与摘要（可在 AI任务 /解析文档 调用）', category: 'office', command: '/解析文档', author: '华为 MSS', version: '2.0.0', connector: 'Doc AI · 对话 Runtime', published: true, invokes: 8900, icon: 'fa-file-import', tags: ['解析'] },
  { id: 'skill-launch-sentiment', name: 'LaunchSentimentReport', desc: '【管理提效】发布会舆情快报 · 产品发布舆情 AI 分析（可在 AI任务 /舆情快报 调用）', category: 'manage', command: '/舆情快报', author: '华为 MSS', version: '1.5.0', connector: 'Social Listening · 对话 Runtime', published: true, invokes: 5400, icon: 'fa-bullhorn', tags: ['舆情', '发布会'] },
  { id: 'skill-survey-insight', name: 'SurveyInsightAnalyzer', desc: '【管理提效】洞察部用户问卷调研分析与报告生成（可在 AI任务 /问卷洞察 调用）', category: 'manage', command: '/问卷洞察', author: '华为 MSS', version: '1.1.0', connector: 'Survey Hub · 对话 Runtime', published: true, invokes: 2100, icon: 'fa-square-poll-vertical', tags: ['问卷', 'MKT'] },
  {
    id: 'skill-review-collect',
    name: '评分采集',
    desc: '【管理提效】电渠购买页订单评论采集 · Amazon/Lazada 等站点样本清洗与交接（可在 AI任务 /评论采集 调用）',
    category: 'manage',
    command: '/评论采集',
    author: '华为 MSS',
    version: '1.0.0',
    connector: 'Amazon/Lazada · 对话 Runtime',
    published: true,
    invokes: 4200,
    icon: 'fa-download',
    tags: ['评论', '电商', '采集', '订单评论'],
    scenarioTags: ['评论分析', '评论', '电商'],
  },
  {
    id: 'skill-review-translate',
    name: '评论语种翻译',
    desc: '【管理提效】多语种订单评论统一译为英语与中文，保留原文对照（可在 AI任务 /评论翻译 调用）',
    category: 'manage',
    command: '/评论翻译',
    author: '华为 MSS',
    version: '1.0.0',
    connector: 'Translate Runtime · 对话 Runtime',
    published: true,
    invokes: 3800,
    icon: 'fa-language',
    tags: ['评论', '翻译', '本地化', '电商'],
    scenarioTags: ['评论分析', '评论', '电商', '翻译', '本地化'],
  },
  {
    id: 'skill-review-cluster',
    name: '订单评论分析',
    desc: '【管理提效】对采集+翻译后的评论做情感判断、用户数据挖掘、卖点 GAP 与分角色建议（可在 AI任务 /评论分析 调用）',
    category: 'manage',
    command: '/评论分析',
    author: '华为 MSS',
    version: '3.1.0',
    connector: 'Amazon/Lazada · 对话 Runtime',
    published: true,
    invokes: 7600,
    icon: 'fa-comments',
    tags: ['评论', '电商', 'VoC', '订单评论', '情感'],
    scenarioTags: ['评论分析', '评论', '电商'],
  },
  { id: 'skill-retail-insight', name: 'RetailInsightPi', desc: '【管理提效】零售信息洞察 π · 门店 DOS/转化/陈列报告（可在 AI任务 /零售洞察 调用）', category: 'manage', command: '/零售洞察', author: '华为 MSS', version: '1.8.0', connector: 'iRetail · 对话 Runtime', published: true, invokes: 9800, icon: 'fa-store', tags: ['零售', '洞察π'] },
  { id: 'skill-price-monitor', name: 'PriceOfferMonitor', desc: '【管理提效】价格监测 · 18 国多渠道价格 & offer 监测（可在 AI任务 /价格监测 调用）', category: 'manage', command: '/价格监测', author: '华为 MSS', version: '3.0.1', connector: 'Market Intel · 对话 Runtime', published: true, invokes: 25600, icon: 'fa-tags', tags: ['价格', 'offer', '价格监测'] },
  { id: 'skill-so-report', name: 'SOReportBuilder', desc: '代表处 SO/SI 排名、环比、IoT 剔除报表（可在 AI任务 /so报表 调用）', category: 'manage', command: '/so报表', author: '华为 MSS', version: '3.0.1', connector: 'ISRP · 对话 Runtime', published: true, invokes: 14300, icon: 'fa-table', tags: ['SO', '代表处', '返利'] },
  { id: 'skill-jd-parser', name: 'JDParser', desc: '【流程提效】招聘 JD 结构化解析与胜任力提取（可在 AI任务 /jd解析 调用）', category: 'process', command: '/jd解析', author: '华为 MSS', version: '1.0.2', connector: 'HR Hub · 对话 Runtime', published: true, invokes: 3200, icon: 'fa-briefcase', tags: ['JD', 'HR'] },
  { id: 'skill-resume-screen', name: 'ResumeScreener', desc: '【流程提效】招聘需求简历分析 · AI 简历筛选与人岗匹配（可在 AI任务 /简历筛选 调用）', category: 'process', command: '/简历筛选', author: '华为 MSS', version: '1.4.0', connector: 'HR Hub · 对话 Runtime', published: true, invokes: 4100, icon: 'fa-user-check', tags: ['简历', 'HR'] },
  { id: 'skill-interview-analysis', name: 'InterviewAnalyzer', desc: '【流程提效】面试记录分析与评估报告生成（可在 AI任务 /面试分析 调用）', category: 'process', command: '/面试分析', author: '华为 MSS', version: '1.2.0', connector: 'HR Hub · 对话 Runtime', published: true, invokes: 2800, icon: 'fa-user-pen', tags: ['面试', 'HR'] },
  { id: 'skill-training-gen', name: 'TrainingContentGen', desc: '【流程提效】AI 辅助培训内容生成 · Nova 新品门店培训（可在 AI任务 /培训内容 调用）', category: 'process', command: '/培训内容', author: '华为 MSS', version: '1.6.0', connector: 'LMS · 对话 Runtime', published: true, invokes: 4900, icon: 'fa-chalkboard-user', tags: ['培训', 'Nova'] },
  { id: 'skill-rag', name: 'MilvusRetriever', desc: '【体验提升】企业知识向量检索 · 按业务部门分区（可在 AI任务 /检索 调用）', category: 'experience', command: '/检索', author: '华为 MSS', version: '2.5.0', connector: 'Milvus · 对话 Runtime', published: true, invokes: 19800, icon: 'fa-database', tags: ['RAG', '知识库'] },
  { id: 'skill-rerank', name: 'CrossEncoderReranker', desc: '【体验提升】检索结果 Cross-Encoder 重排序（可在 AI任务 /rerank 调用）', category: 'experience', command: '/rerank', author: '华为 MSS', version: '1.0.0', connector: 'Model Hub · 对话 Runtime', published: true, invokes: 6200, icon: 'fa-sort-amount-down', tags: ['RAG'] },
  { id: 'skill-retail-coach', name: 'RetailAICoach', desc: '【体验提升】零售 AI 陪练 · 卖点演练与考核反馈（可在 AI任务 /陪练 调用）', category: 'experience', command: '/陪练', author: '华为 MSS', version: '1.1.0', connector: 'LMS · 对话 Runtime', published: true, invokes: 3600, icon: 'fa-headset', tags: ['陪练', '门店'] },
  { id: 'skill-complaint-sop', name: 'ComplaintSOPMatch', desc: '【体验提升】客诉 SOP 检索与话术推荐（可在 AI任务 /客诉 调用）', category: 'experience', command: '/客诉', author: '华为 MSS', version: '2.2.0', connector: 'CSC Ticket · 对话 Runtime', published: true, invokes: 8300, icon: 'fa-ticket', tags: ['客诉', 'SOP'] },
  { id: 'skill-wecom', name: 'WeComPush', desc: '企业微信消息/卡片/群机器人推送（可在 AI任务 /wecom 调用）', category: 'experience', command: '/wecom', author: '华为 MSS', version: '2.0.0', connector: 'WeCom API · 对话 Runtime', published: true, invokes: 22100, icon: 'fa-comment-dots', tags: ['WeCom', '推送'] },
];

function withRunnablePack(skill: PrototypeSkillSeed): PrototypeSkillSeed {
  const pack = getSkillPack(skill.id);
  if (!pack) return skill;
  return {
    ...skill,
    instructions: pack.instructions,
    planSteps: [...pack.planSteps],
  };
}

export const PROTOTYPE_SKILLS: PrototypeSkillSeed[] = withSkillOwnership(
  PROTOTYPE_SKILLS_RAW.map(withRunnablePack),
);
