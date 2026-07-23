import type { RunnableAgentPack } from '@/domain/agents/types';

function pack(p: RunnableAgentPack): RunnableAgentPack {
  return p;
}

/** Phase1 专家可运行演示包 + 业务橱窗门面专家 */
export const AGENT_PACKS: RunnableAgentPack[] = [
  pack({
    id: 'agent-marketing',
    primarySkillId: 'skill-data-analysis',
    agentType: 'marketing',
    systemPrompt:
      '你是 MSS 营销 Agent，面向业务的问数、问报告与智能分析专家。优先编排：多源数据分析 → SO/零售洞察 → 价格与异动解释 → 行动建议与简报。口径不清时先声明假设。标注演示样例。',
    demoPrompt:
      '@营销 Agent 请基于演示样例做一次智能分析：近一周欧洲穿戴销售趋势、代表处排名异动，并输出可进例会的简报与三条行动建议（可衔接 /数据分析、/so报表）。',
    planSteps: [
      '澄清问数/问报告目标与口径',
      '挂载数据分析并汇总关键指标（/数据分析）',
      '对齐 SO/零售报表并标注异常（/so报表、零售洞察）',
      '输出洞察结论、风险与行动建议简报',
    ],
    mockReport: `✅ **营销 Agent 完成**（演示样例）

### 问数结论
欧洲穿戴周 SO 环比偏正；DE/UK 领跑；南欧库存效率待改善。

### 报告要点
- 渠道：UK 高转化素材可复用
- 价格：关注促销 ROI 回落 SKU
- 库存：南欧畅销 SKU 需补货

### 行动
1. 补齐南欧畅销 SKU  
2. 复用 UK 高转化素材  
3. 下周复盘促销 ROI`,
  }),
  pack({
    id: 'agent-data-analysis',
    primarySkillId: 'skill-data-analysis',
    agentType: 'marketing',
    systemPrompt:
      '你是 MSS 数据分析专家。优先编排：多源数据分析 → SO 报表 → 工作总结。输出可进例会的洞察与 NBA，口径不清时先声明。标注演示样例。',
    demoPrompt:
      '@数据分析 Agent /数据分析 请基于演示样例，输出近一周欧洲穿戴销售趋势、代表处排名异动与行动建议；必要时衔接 /so报表 口径说明。',
    planSteps: [
      '挂载主 Skill：多源数据分析（/数据分析）',
      '对齐 SO 口径并校验异常（/so报表）',
      '归因拆解与可视化要点',
      '汇总行动建议并生成简要工作总结要点',
    ],
    mockReport: `✅ **数据分析 Agent 编排完成**（演示样例）

### 编排路径
1. MultiSourceAnalysis → 2. SO 报表口径 → 3. 行动建议

### 结论摘要
欧洲穿戴周 SO 环比偏正；DE/UK 领跑；南欧库存效率待改善。

### 行动
- 补齐南欧畅销 SKU
- 复用 UK 高转化素材
- 下周复盘促销 ROI`,
  }),
  pack({
    id: 'agent-doc-review',
    primarySkillId: 'skill-doc-compliance',
    agentType: 'knowledge',
    systemPrompt:
      '你是文档解读与合规专家。优先：合规筛查 → 文档生成改写建议 → 文档解析。明确非法律意见，需合规终审。',
    demoPrompt:
      '@文档解读 Agent /合规筛查 请对演示样例营销文案做合规筛查，并给出改写要点与待人工确认项。',
    planSteps: [
      '挂载合规筛查 Skill',
      '定位高/中风险表述',
      '给出改写与放行条件',
      '必要时生成合规友好初稿要点',
    ],
    mockReport: `✅ **文档解读 Agent 完成**（演示样例）

### 风险
高 1 / 中 2（演示）

### 建议
删除绝对化与疑似疗效宣称；补充来源脚注；合规终审后放行。`,
  }),
  pack({
    id: 'agent-file-organize',
    primarySkillId: 'skill-file-archive',
    agentType: 'knowledge',
    systemPrompt: '你是文件整理专家。优先智能归档，并输出个人总结要点。命名与路径需可执行。',
    demoPrompt:
      '@文件整理 Agent /文件整理 请基于演示样例，给出会议纪要与报表的归档方案，并附本周工作总结要点。',
    planSteps: [
      '识别文件类型与业务归属',
      '生成归档路径与命名',
      '抽取摘要标签',
      '输出工作总结精简版',
    ],
    mockReport: `✅ **文件整理 Agent 完成**（演示样例）

### 归档
\`/MSS/区域经营/2026-Q2/\` 下按会议纪要/报表分类（演示）

### 总结要点
本周完成周报与归档对齐；风险在口径不一致。`,
  }),
  pack({
    id: 'agent-ppt',
    primarySkillId: 'skill-ppt-gen',
    agentType: 'marketing',
    systemPrompt: '你是 PPT 生成专家。先定大纲与一页一事，再补数据要点；输出可进制作工具的结构而非二进制。',
    demoPrompt:
      '@PPT 生成 Agent /ppt 请基于演示样例，生成欧洲穿戴周度经营 PPT 大纲（8～10 页）及每页要点。',
    planSteps: [
      '确认汇报场景与页数',
      '设计大纲（一页一事）',
      '填充图表与结论页',
      '输出演讲备注',
    ],
    mockReport: `✅ **PPT 生成 Agent 完成**（演示样例 · 9 页大纲）

封面 → 结论 → SO 趋势 → 排名 → 归因 → DOS → 价格 → 行动项 → 附录。`,
  }),
  pack({
    id: 'agent-meeting',
    primarySkillId: 'skill-meeting-minutes',
    agentType: 'knowledge',
    systemPrompt: '你是会议纪要专家。决议/待办必须含 Owner 与 Due；模糊处标「待确认」。可建议 WeCom 推送预览。',
    demoPrompt:
      '@会议纪要 Agent /会议纪要 请基于演示样例生成欧洲穿戴周例会纪要，并给出 WeCom 推送预览要点。',
    planSteps: [
      '提炼决议与待办',
      '整理未决问题',
      '生成可分发纪要',
      '组装企业微信推送预览',
    ],
    mockReport: `✅ **会议纪要 Agent 完成**（演示样例）

### 待办
缺货清单（供应/周五）；素材本地化（MKT/下周三）

### 推送预览
标题：欧洲穿戴周例会纪要（演示 · 未真实发送）`,
  }),
  pack({
    id: 'agent-launch-sentiment',
    primarySkillId: 'skill-launch-sentiment',
    agentType: 'marketing',
    systemPrompt: '你是发布会舆情专家。输出声量/情感/热点与分角色建议，样本不足时给定性并标注演示样例。',
    demoPrompt:
      '@舆情快报 Agent /舆情快报 请基于演示样例输出穿戴新品发布 48h 舆情快报与 PR/MKT/服务建议。',
    planSteps: [
      '界定监测窗口',
      '情感与热点聚类',
      '风险机会识别',
      '分角色建议与推送要点',
    ],
    mockReport: `✅ **舆情快报 Agent 完成**（演示样例）

情感偏正；热点：续航 / 价格 / 设计。建议放大续航原声，准备价格异议素材。`,
  }),
  pack({
    id: 'agent-survey',
    primarySkillId: 'skill-survey-insight',
    agentType: 'marketing',
    systemPrompt: '你是问卷洞察专家。关注 NPS/痛点/分人群差异，给出 MKT/产品/服务可执行建议。',
    demoPrompt:
      '@问卷洞察 Agent /问卷洞察 请基于演示样例分析满意度问卷：NPS、痛点 TOP 与行动建议。',
    planSteps: [
      '样本与题项概览',
      '核心指标与分层',
      '痛点亮点 TOP',
      '行动建议',
    ],
    mockReport: `✅ **问卷洞察 Agent 完成**（演示样例）

NPS 约 32～38；痛点：物流时效、包装本地化。建议强化物流节点通知。`,
  }),
  pack({
    id: 'agent-review-collect',
    primarySkillId: 'skill-review-collect',
    agentType: 'knowledge',
    systemPrompt:
      '你是评分采集 Agent。优先调用「评分采集」Skill（/评论采集），从 Amazon 等购买页采集订单评论并清洗交接；不做深度情感分析。',
    demoPrompt:
      '@评分采集 Agent /评论采集 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C）购买页订单评论，输出样本清单并交接翻译。',
    planSteps: [
      '确认平台/ASIN/品类',
      '采集购买页订单评论',
      '清洗去重与质量标注',
      '交接语种翻译 Agent',
    ],
    mockReport: `✅ **评分采集 Agent 完成**（演示样例 · B0FPG9431G）

已输出 12 条样本清单（es/en）。请继续调用 **语种翻译 Agent**（/评论翻译）。`,
  }),
  pack({
    id: 'agent-review-translate',
    primarySkillId: 'skill-review-translate',
    agentType: 'knowledge',
    systemPrompt:
      '你是语种翻译 Agent。优先调用「评论语种翻译」Skill（/评论翻译），将多语种评论统一译为英语与中文并保留原文；不做情感聚类。',
    demoPrompt:
      '@语种翻译 Agent /评论翻译 请将 Amazon MX 演示样例评论统一译为英语和中文，输出双语对照表。',
    planSteps: [
      '接收采集样本并识别源语',
      '逐条译为英语与中文',
      '术语统一与低置信度标注',
      '交接评论分析 Agent',
    ],
    mockReport: `✅ **语种翻译 Agent 完成**（演示样例 · B0FPG9431G）

已输出中英双语对照表。请继续调用 **评论分析 Agent**（/评论分析）。`,
  }),
  pack({
    id: 'agent-review',
    primarySkillId: 'skill-review-cluster',
    agentType: 'knowledge',
    systemPrompt:
      '你是评论分析 Agent。优先调用「订单评论分析」Skill（/评论分析），承接采集+翻译后的清洗语料，输出情感判断、用户数据挖掘与行动建议。',
    demoPrompt:
      '@评论分析 Agent /评论分析 请基于已清洗的 Amazon MX 演示样例 ASIN B0FPG9431G 输出情感判断、用户洞察、卖点 GAP 与分角色建议。',
    planSteps: [
      '确认上游采集/翻译语料',
      '情感判断与主题聚类',
      '用户数据挖掘与预警',
      '电商/服务/MKT 行动建议',
    ],
    mockReport: `✅ **评论分析 Agent 完成**（演示样例 · B0FPG9431G · 经采集→翻译）

负面 TOP：GPS 精度 / 价格预期 / 连接偶发。建议 Listing 补 GPS 场景说明，服务沉淀多语 FAQ。`,
  }),
  pack({
    id: 'agent-retail-insight',
    primarySkillId: 'skill-retail-insight',
    agentType: 'marketing',
    systemPrompt: '你是零售洞察 π 专家。聚焦 DOS/转化/陈列异常门店与可执行动作。',
    demoPrompt:
      '@零售洞察 Agent /零售洞察 请基于演示样例输出 3 月代表处 DOS/转化洞察与异常门店动作。',
    planSteps: [
      '选定范围与口径',
      '识别异常/机会门店',
      '原因假设',
      '零售/供应/培训动作',
    ],
    mockReport: `✅ **零售洞察 Agent 完成**（演示样例）

南欧 12 家 DOS 偏高；建议补货 + 陈列换新 + 复制 DE 话术。`,
  }),
  pack({
    id: 'agent-price-monitor',
    primarySkillId: 'skill-price-monitor',
    agentType: 'marketing',
    systemPrompt: '你是价格监测专家。关注异常降价/窜货与 offer 变化，给电商与渠道跟进建议。',
    demoPrompt:
      '@价格监测 Agent /价格监测 请基于演示样例输出 DE/UK/MX 主力 SKU 价格与 offer 监测简报。',
    planSteps: [
      '确认国家渠道 SKU',
      '聚合价格与 offer',
      '异常告警',
      '跟进建议与推送要点',
    ],
    mockReport: `✅ **价格监测 Agent 完成**（演示样例）

UK 第三方 -4% 需核实授权促销；建议核对价盘并同步活动日历。`,
  }),
  pack({
    id: 'agent-hr-resume',
    primarySkillId: 'skill-resume-screen',
    agentType: 'knowledge',
    systemPrompt:
      '你是招聘协同专家。编排：JD 解析 → 简历筛选 → 面试分析。辅助决策，非录用决定。',
    demoPrompt:
      '@简历筛选 Agent /简历筛选 请基于演示样例完成人岗匹配，并说明与 JD 解析、面试分析的衔接要点。',
    planSteps: [
      '对齐 JD 关键要求（/jd解析）',
      '简历匹配打分（/简历筛选）',
      '输出面试关注清单',
      '说明二面/面试分析衔接',
    ],
    mockReport: `✅ **招聘协同 Agent 完成**（演示样例）

匹配 78/100；建议推进一面。硬性：电商 3 年；关注跳槽频率与英语场景题。`,
  }),
  pack({
    id: 'agent-training',
    primarySkillId: 'skill-training-gen',
    agentType: 'knowledge',
    systemPrompt: '你是培训内容专家。生成大纲/测验/演练，并可衔接门店陪练。',
    demoPrompt:
      '@培训内容 Agent /培训内容 请基于演示样例生成 Nova 新品 45 分钟门店培训大纲，并给出一轮陪练场景要点。',
    planSteps: [
      '设计学习目标与大纲',
      '生成测验与演练脚本',
      '衔接陪练考核点',
      '培训后跟踪建议',
    ],
    mockReport: `✅ **培训内容 Agent 完成**（演示样例）

45' 大纲已生成；陪练场景：价格异议处理，话术完整性 4/5。`,
  }),
  pack({
    id: 'agent-knowledge',
    primarySkillId: 'skill-rag',
    agentType: 'knowledge',
    systemPrompt:
      '你是 MSS 知识 Agent，面向业务的知识问答与知识陪练专家。编排：检索 → 重排 → SOP/话术；需要演练时衔接培训与陪练。回答必须带引用，未命中时诚实说明。',
    demoPrompt:
      '@知识 Agent 请基于演示样例完成：1）回答「欧洲门店 DOS 过高应按什么 SOP 处理？」并给出引用；2）给出一轮相关话术陪练要点。',
    planSteps: [
      '澄清是知识问答还是陪练演练',
      '分区检索与重排（/检索、/rerank）',
      '生成带引用回答或匹配 SOP',
      '如需陪练则给出场景脚本与评分要点',
    ],
    mockReport: `✅ **知识 Agent 完成**（演示样例）

### 知识问答
命中《DOS 异常处置 SOP》；流程：核对口径 → 识别缺货/滞销 → 调拨/促销 → 培训跟进。

### 陪练要点
场景：库存异议解释；先对齐口径再给动作；话术完整性建议 4/5。`,
  }),
  pack({
    id: 'agent-retail-coach',
    primarySkillId: 'skill-retail-coach',
    agentType: 'knowledge',
    systemPrompt: '你是零售陪练专家。模拟顾客异议、评分并给金句；可衔接培训内容。',
    demoPrompt:
      '@零售陪练 Agent /陪练 请基于演示样例开展「价格贵」异议处理陪练：脚本、评分与改进建议。',
    planSteps: [
      '设定场景与考核点',
      '模拟对话并评分',
      '输出改进与金句',
      '建议再练与培训衔接',
    ],
    mockReport: `✅ **零售陪练 Agent 完成**（演示样例）

评分：话术 4/5 · 价值塑造 3/5。先共情再对比，补充以旧换新钩子。`,
  }),
];
