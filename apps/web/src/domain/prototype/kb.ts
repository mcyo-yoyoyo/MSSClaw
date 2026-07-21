import type { PrototypeKbCollection, PrototypeKbDocument } from '@/domain/prototype/types';

/** 来源：index.html KB_COLLECTIONS */
export const KB_COLLECTIONS: PrototypeKbCollection[] = [
  { id: 'all', name: '全部文档', icon: 'fa-layer-group' },
  { id: 'public', name: '公共', icon: 'fa-building-columns', desc: '平台规范 · 通用制度' },
  { id: 'gtm', name: 'GTM', icon: 'fa-rocket', desc: '上市 · 准入 · 区域策略' },
  { id: 'mkt', name: 'MKT', icon: 'fa-bullhorn', desc: '品牌 · 活动 · 洞察' },
  { id: 'ecommerce', name: '电商', icon: 'fa-cart-shopping', desc: '评论 · offer · 平台规则' },
  { id: 'retail', name: '零售', icon: 'fa-store', desc: '门店 · 培训 · 洞察 π' },
  { id: 'service', name: '服务', icon: 'fa-headset', desc: 'SOP · 客诉 · 质检' },
  { id: 'channel', name: '渠道', icon: 'fa-diagram-project', desc: '返利 · 价盘 · 代表处' },
  { id: 'hr', name: 'HR', icon: 'fa-user-tie', desc: 'JD · 招聘 · 人岗标准' },
  { id: 'finance', name: '财经', icon: 'fa-coins', desc: '返利对账 · 价保 · 财务口径' },
  { id: 'quality', name: '质量运营', icon: 'fa-clipboard-check', desc: '合规检查 · 审计 · 质量规范' },
  { id: 'other', name: '其他', icon: 'fa-folder-open', desc: '未分类 · 临时归档' },
];

/** 来源：index.html DEFAULT_KB_DOCS */
export const PROTOTYPE_KB_DOCS: PrototypeKbDocument[] = [
  { id: 'kb-platform-guide', title: 'MSS Claw 平台使用指南', desc: 'AI任务、Agent/Skill 挂载、任务中心与交付物流转说明', collection: 'public', type: 'PDF', size: '2.1 MB', pages: 42, clearance: 'L2', indexed: true, chunks: 186, tags: ['平台', '指南'], updatedAt: '2026-07-08', author: 'MSS AI变革' },
  { id: 'kb-agent-playbook', title: 'Agent/Skill 配置与发布规范', desc: 'Agent 设计规范、Skill 挂载策略、审批与审计要求', collection: 'public', type: 'PDF', size: '1.8 MB', pages: 36, clearance: 'L2', indexed: true, chunks: 168, tags: ['Agent', 'Skill'], updatedAt: '2026-07-08', author: 'MSS AI变革' },
  { id: 'kb-gtm-launch', title: 'GTM 上市节奏 Playbook', desc: 'Mate/Pura 上市里程碑、区域准入与首销 KPI 模板', collection: 'gtm', type: 'PDF', size: '3.2 MB', pages: 54, clearance: 'L3', indexed: true, chunks: 412, tags: ['上市', 'GTM'], updatedAt: '2026-07-07', author: 'GTM 部' },
  { id: 'kb-latam-compliance', title: '拉美/EU 市场准入 Checklist', desc: 'ANATEL 认证、RoHS、环保参数与准入清单', collection: 'gtm', type: 'PDF', size: '3.6 MB', pages: 62, clearance: 'L3', indexed: true, chunks: 520, tags: ['拉美', '准入'], updatedAt: '2026-06-15', author: 'GTM 合规' },
  { id: 'kb-campaign-q3', title: '2025 Q3 全渠道活动 Playbook', desc: '大促节奏、预算池、活动物料与审批流', collection: 'mkt', type: 'PDF', size: '2.4 MB', pages: 48, clearance: 'L3', indexed: true, chunks: 312, tags: ['活动', 'MKT'], updatedAt: '2026-06-28', author: 'MKT' },
  { id: 'kb-wearable-okr', title: '2025 可穿戴 OKR 复盘', desc: 'KR 进度、续航目标卡点与代表处反馈汇总', collection: 'mkt', type: 'XLSX', size: '540 KB', pages: 6, clearance: 'L2', indexed: true, chunks: 72, tags: ['穿戴', 'OKR'], updatedAt: '2026-06-30', author: 'MKT 洞察' },
  { id: 'kb-survey-guide', title: '洞察部用户问卷调研方法', desc: '问卷设计、样本配额、开放题编码与洞察报告模板', collection: 'mkt', type: 'DOCX', size: '680 KB', pages: 18, clearance: 'L2', indexed: true, chunks: 96, tags: ['问卷', '洞察'], updatedAt: '2026-07-04', author: 'MKT 洞察部' },
  { id: 'kb-review-sop', title: 'Amazon/Lazada 评论分析 SOP', desc: '评分采集 → 语种翻译（中英）→ 评论分析三段口径与 MX/EU 平台差异', collection: 'ecommerce', type: 'PDF', size: '1.2 MB', pages: 22, clearance: 'L2', indexed: true, chunks: 142, tags: ['评论', '电商'], updatedAt: '2026-07-06', author: '电商运营' },
  { id: 'kb-offer-monitor', title: '电商 Offer 监测口径说明', desc: 'SKU 字段映射、多国采集 VPN 策略与复核 URL 清单', collection: 'ecommerce', type: 'XLSX', size: '420 KB', pages: 8, clearance: 'L2', indexed: true, chunks: 88, tags: ['offer', '价格'], updatedAt: '2026-07-07', author: '电商数据' },
  { id: 'kb-retail-pi', title: '零售洞察 π 报告模板', desc: '门店 DOS、转化、陈列合规与代表处下钻结构', collection: 'retail', type: 'PDF', size: '1.5 MB', pages: 28, clearance: 'L2', indexed: true, chunks: 168, tags: ['零售', '洞察π'], updatedAt: '2026-07-05', author: '零售运营' },
  { id: 'kb-nova-training', title: 'Nova 新品培训内容框架', desc: '卖点脚本、对抗演练题库、门店考核指标', collection: 'retail', type: 'Folder', size: '24 MB', pages: 0, clearance: 'L2', indexed: true, chunks: 860, tags: ['Nova', '培训'], updatedAt: '2026-07-03', author: '零售培训' },
  { id: 'kb-sop-complaint', title: '消费者服务 SOP · 电池过热客诉', desc: '分级处理、话术、OTA 引导与升级路径', collection: 'service', type: 'PDF', size: '1.1 MB', pages: 24, clearance: 'L2', indexed: true, chunks: 186, tags: ['客诉', 'SOP'], updatedAt: '2026-07-01', author: '消费者服务' },
  { id: 'kb-sop-bundle', title: '服务 SOP 知识包 v4', desc: '客诉分类、质检评分、备件策略综合包', collection: 'service', type: 'Bundle', size: '18 MB', pages: 0, clearance: 'L2', indexed: true, chunks: 2140, tags: ['SOP', '质检'], updatedAt: '2026-06-20', author: 'CSC' },
  { id: 'kb-rebate-q3', title: '渠道返利政策 2025 Q3', desc: '代表处返利规则、价保策略、破价稽核要点', collection: 'channel', type: 'XLSX', size: '860 KB', pages: 8, clearance: 'L3', indexed: true, chunks: 142, tags: ['返利', '价保'], updatedAt: '2026-07-06', author: '渠道管理部' },
  { id: 'kb-price-master', title: '价盘政策主数据说明', desc: 'FD/KA 价盘层级、价保模拟与破价预警规则', collection: 'channel', type: 'DOCX', size: '420 KB', pages: 16, clearance: 'L3', indexed: true, chunks: 88, tags: ['价盘'], updatedAt: '2026-07-04', author: '渠道财经' },
  { id: 'kb-jd-template', title: '招聘 JD 模板库', desc: 'MSS 各序列 JD 结构、胜任力模型与合规用语', collection: 'hr', type: 'DOCX', size: '520 KB', pages: 12, clearance: 'L2', indexed: true, chunks: 76, tags: ['JD', '招聘'], updatedAt: '2026-07-02', author: 'HR' },
  { id: 'kb-resume-rubric', title: '简历筛选评分标准', desc: '人岗匹配维度、面试分析 Agent 输出字段说明', collection: 'hr', type: 'PDF', size: '380 KB', pages: 10, clearance: 'L2', indexed: true, chunks: 54, tags: ['简历', 'HR'], updatedAt: '2026-06-28', author: 'HR' },
  { id: 'kb-rebate-finance', title: '返利/价保财务对账说明', desc: '代表处对账周期、异常返利稽核与 Finance Hub 口径', collection: 'finance', type: 'XLSX', size: '640 KB', pages: 6, clearance: 'L3', indexed: true, chunks: 68, tags: ['返利', '财经'], updatedAt: '2026-07-05', author: '财经' },
  { id: 'kb-wearable-medical', title: '可穿戴医疗用语合规检查清单', desc: '营销物料、合同、招投标文档医疗宣称与风险筛查要点', collection: 'quality', type: 'PDF', size: '920 KB', pages: 20, clearance: 'L3', indexed: true, chunks: 124, tags: ['合规', '医疗用语'], updatedAt: '2026-07-07', author: '质量运营' },
  { id: 'kb-quality-audit', title: '质量运营审计规范', desc: '文档合规抽检、Agent 调用审计与问题闭环流程', collection: 'quality', type: 'PDF', size: '760 KB', pages: 16, clearance: 'L2', indexed: true, chunks: 98, tags: ['审计', '质量'], updatedAt: '2026-07-01', author: '质量运营' },
  { id: 'kb-assistant-bridge', title: '员工助手多源接入说明', desc: 'Onebox/WeLink/Email 与知识库衔接的手工衔接指引', collection: 'other', type: 'MD', size: '120 KB', pages: 8, clearance: 'L1', indexed: true, chunks: 32, tags: ['员工助手'], updatedAt: '2026-07-08', author: 'MSS AI变革' },
];
