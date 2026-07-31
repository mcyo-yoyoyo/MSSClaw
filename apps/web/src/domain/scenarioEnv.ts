import type { DiscoverScenarioId } from '@/domain/scenarioCapabilities';

/**
 * 场景三层对外叙事：**学习 → 准备 → 开干**
 *
 * 「准备」层产品语义：
 * - **1.0（当前）**：体外参照清单——下载后自行配置设备 / 工具 / 模型，再开干打样。
 * - **2.0+**：平台逐步托管运行环境与模型，「自备」权重下降。
 *
 * 与「一键打样」差异：准备层是体外 DIY 参照；一键打样是平台内开干入口。
 */
export const SCENARIO_JOURNEY_COPY = {
  flow: '学习 → 准备 → 开干',
  pageSubtitle: '学习 → 准备 → 开干 · 下载学习（体外）· 一键打样（在线）',
  pageTip:
    '先在弹窗预览洞察 / 案例 / 课件与学练路径；关闭后可逐项查看①②③详情。体外用「下载学习」，在线跑任务用「一键打样」。',
  learnBadge: '学习',
  learnSectionTitle: '① 学习',
  learnSectionHint: '前沿洞察 · 场景案例 · 培训课件 · 点击卡片预览',
  learnExtendLabel: '学习 · 延伸知识',
  /** 准备层 */
  layerBadge: '准备',
  sectionTitle: '② 准备',
  sectionHint: '体外参照清单 · 自行配置设备 / 工具 / 模型 · 1.0 非平台代配',
  panelFooter:
    '说明离开平台自行打样时要准备什么。平台内开干请用上方「一键打样」；2.0 起将由平台逐步托管运行环境与模型。',
  inspectBanner:
    '准备清单（只读）。按条目自行配置环境，非平台内调用。后续版本将由平台托管更多运行环境与模型。',
  inspectToolLabel: '准备 · 体外参照',
  slotClickHint: '准备清单 · 点击查看',
  learnPackTitle: '一键下载：学习材料 + 准备清单 + 打样参照（.zip）',
  learnMdHeading: '## 准备 · 体外参照环境（自行配置）',
  learnMdEmpty:
    '## 准备 · 体外参照环境\n\n（本场景暂未配置硬件 / Coding / 模型参照清单）\n\n',
  learnIntro:
    '> 学习：先读洞察 / 案例 / 课件；准备：按体外清单自行配置；开干：回到平台「一键打样」在线跑任务。',
  learnPathStep:
    '2. 按「准备」清单自行配置设备 / AI 工具 / 模型（体外参照；1.0 非平台代配）',
  envToolsCaption: '相关外部工具（准备参照，打开了解）',
  slotHardware: '建议自备的硬件设备',
  slotCoding: '建议使用的 AI Coding / IDE',
  slotModels: '建议对接的云端 / 本地模型',
  runBadge: '开干',
  runSectionTitle: '③ 开干',
  runSectionHint: '对照能力说明 · 在线执行请用上方「一键打样」',
  runInspectHint:
    '本条目为开干前对照说明，仅供了解。不会在此页调用 Agent / Skill / Tool；执行请用上方「一键打样」。',
} as const;

/** @deprecated 使用 SCENARIO_JOURNEY_COPY；保留别名避免大面积改 import */
export const TOOLKIT_LAYER_COPY = SCENARIO_JOURNEY_COPY;

/** AI Coding / IDE（准备 · 体外参照） */
export interface ScenarioCodingTool {
  name: string;
  note?: string;
  /** 官网或说明页，仅打开了解 */
  url?: string;
}

/** 云端或本地大模型条目 */
export interface ScenarioModelRef {
  name: string;
  kind: 'cloud' | 'local';
  note?: string;
}

/**
 * 场景「准备」层：体外打样参照环境清单（1.0）
 * 非平台内调用入口；与首页「常用 AI 工具」解耦。
 */
export interface ScenarioEnv {
  /** 电脑 / 外设等硬件要求 */
  hardware?: string;
  codingTools?: ScenarioCodingTool[];
  cloudModels?: ScenarioModelRef[];
  localModels?: ScenarioModelRef[];
}

export function isScenarioEnvFilled(env?: ScenarioEnv | null): boolean {
  if (!env) return false;
  return Boolean(
    env.hardware?.trim() ||
      env.codingTools?.length ||
      env.cloudModels?.length ||
      env.localModels?.length,
  );
}

export function countScenarioEnvSlots(env?: ScenarioEnv | null): {
  hardware: boolean;
  coding: boolean;
  models: boolean;
} {
  return {
    hardware: Boolean(env?.hardware?.trim()),
    coding: Boolean(env?.codingTools?.length),
    models: Boolean(env?.cloudModels?.length || env?.localModels?.length),
  };
}

/** 九大发现场景的环境清单种子（对齐真实连接器 / Skill 口径） */
export const SCENARIO_ENV_BY_ID: Record<DiscoverScenarioId, ScenarioEnv> = {
  'price-offer-monitor': {
    hardware:
      'GTM/渠道笔记本（建议 16GB+）；双屏便于对照 Amazon 等商城后台与价差告警；需能访问区域站点与 Market Intel 采集出口。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护 /价格监测 Skill Prompt、国家白名单与异动规则',
        url: 'https://cursor.com',
      },
      {
        name: 'VS Code',
        note: '可选；编辑价监 JSON 配置与截图证据目录',
      },
    ],
    cloudModels: [
      {
        name: '企业网关大模型（对接对话 Runtime）',
        kind: 'cloud',
        note: '异动摘要、调价建议与周报叙述（Skill: skill-price-monitor）',
      },
    ],
    localModels: [
      {
        name: '一般不部署本地模型',
        kind: 'local',
        note: '价盘采集走 Market Intel / 拉美价盘哨兵；内网可只换企业网关',
      },
    ],
  },
  'ecommerce-review': {
    hardware:
      '电商/服务分析岗 16GB+ 本机；采集高峰建议有线网络；需能访问 Amazon 等购买页与亚太评论雷达。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护三段链路 Prompt：/评论采集 → /评论翻译 → /评论分析',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: '多语翻译模型（企业网关）',
        kind: 'cloud',
        note: '评论统一译为英语与中文，保留原文（agent-review-translate）',
      },
      {
        name: '文本分析大模型',
        kind: 'cloud',
        note: '情感聚类与差评周报（skill-review-cluster）',
      },
    ],
    localModels: [
      {
        name: '可选：不出域翻译网关',
        kind: 'local',
        note: '敏感站点可切私有化翻译；演示默认云端',
      },
    ],
  },
  'l10n-translation': {
    hardware: 'MKT/本地化岗双屏：左源语物料、右目标语对照；访问术语表与禁译表共享盘。',
    codingTools: [
      {
        name: 'Cursor',
        note: '迭代术语抽检规则；复用 /评论翻译 做物料小语种初译',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: '企业翻译大模型',
        kind: 'cloud',
        note: '阿语/法语等初译与回译抽检（agent-review-translate）',
      },
    ],
    localModels: [
      {
        name: '可选：本地术语向量检索',
        kind: 'local',
        note: '品牌词/禁译词不出域匹配',
      },
    ],
  },
  'retail-training': {
    hardware:
      '门店平板或培训室笔记本；耳机/麦克风用于陪练录音反馈；可访问 LMS 课件包。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护 /陪练 考核口径与 /培训内容 脚本包',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: '对话大模型（对话 Runtime）',
        kind: 'cloud',
        note: '卖点演练与即时反馈（skill-retail-coach）',
      },
      {
        name: '语音合成（可选）',
        kind: 'cloud',
        note: '示范话术播报；非打样必选项',
      },
    ],
  },
  'customer-service': {
    hardware: 'CSC 一线工位电脑 + 耳机；稳定内网访问客诉 SOP 知识分区与工单系统。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护 SOP 切片标签与 /客诉、/检索 Prompt',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: 'RAG 问答模型 + Milvus',
        kind: 'cloud',
        note: '带引用话术（skill-rag / skill-complaint-sop）',
      },
    ],
    localModels: [
      {
        name: '可选：部门私有 Embedding',
        kind: 'local',
        note: '敏感客诉知识可私有化向量化',
      },
    ],
  },
  'ops-analytics': {
    hardware:
      'GTM/渠道分析岗 16GB+、宽屏；需开通 ISRP 取数账号与代表处权限。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护 /so报表 IoT 剔除规则与周清字段',
        url: 'https://cursor.com',
      },
      {
        name: 'Excel / Sheets',
        note: '验收导出明细、与 ISRP 结果对照（非 IDE）',
      },
    ],
    cloudModels: [
      {
        name: '数据分析大模型',
        kind: 'cloud',
        note: '归因叙述与异常解读（skill-so-report / skill-data-analysis）',
      },
    ],
  },
  'fulfillment-settlement': {
    hardware:
      '财经/质量运营工位双屏：左结算/验收 PDF，右应结明细；扫描枪可选；访问 Doc AI。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护字段抽取模板与差异规则（/解析文档 + /数据分析）',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: '文档理解模型（Doc AI）',
        kind: 'cloud',
        note: '结算单/验收单结构化（skill-doc-parser）',
      },
      {
        name: '数据分析模型',
        kind: 'cloud',
        note: '应结对照与差异清单（skill-data-analysis）',
      },
    ],
    localModels: [
      {
        name: '可选：本地 OCR',
        kind: 'local',
        note: '票证不出域时的版面识别',
      },
    ],
  },
  'knowledge-deposit': {
    hardware: '知识管理员办公本；对象存储/网盘用于指南原稿；可访问 Milvus 分区。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护切片规范、分区标签与 /检索 /rerank 验收用例',
        url: 'https://cursor.com',
      },
      {
        name: 'Markdown 编辑器',
        note: '指南初稿与 CASE 级说明（可选 Obsidian）',
      },
    ],
    cloudModels: [
      {
        name: 'Embedding + MilvusRetriever',
        kind: 'cloud',
        note: '入库后带引用问答（skill-rag / skill-file-archive）',
      },
    ],
    localModels: [
      {
        name: '可选：本地 embedding',
        kind: 'local',
        note: '敏感指南私有化向量库',
      },
    ],
  },
  'hr-interview': {
    hardware:
      'HR 笔记本；线上面试需摄像头/麦克风；本地磁盘可放 200+ 简历包；访问 HR Hub。',
    codingTools: [
      {
        name: 'Cursor',
        note: '维护 /jd解析 /简历筛选 /面试分析 评分口径',
        url: 'https://cursor.com',
      },
    ],
    cloudModels: [
      {
        name: '文档理解大模型',
        kind: 'cloud',
        note: 'JD 与简历结构化（skill-jd-parser / skill-resume-screen）',
      },
      {
        name: '对话总结模型（可选）',
        kind: 'cloud',
        note: '面试纪要结构化（skill-interview-analysis）',
      },
    ],
  },
};

export function getScenarioEnv(scenarioId: string): ScenarioEnv | null {
  if (scenarioId in SCENARIO_ENV_BY_ID) {
    return SCENARIO_ENV_BY_ID[scenarioId as DiscoverScenarioId];
  }
  return null;
}

/** 写入学习包 LEARN.md 的「准备」层摘要（1.0：体外参照） */
export function formatScenarioEnvLearnSection(env?: ScenarioEnv | null): string {
  if (!isScenarioEnvFilled(env)) {
    return SCENARIO_JOURNEY_COPY.learnMdEmpty;
  }
  const lines: string[] = [
    SCENARIO_JOURNEY_COPY.learnMdHeading,
    '',
    '> 准备清单：离开平台自行打样时对照配置；不是平台代配。2.0 起平台托管运行环境后，本清单权重将下降。',
    '',
  ];
  if (env!.hardware?.trim()) {
    lines.push(`### ${SCENARIO_JOURNEY_COPY.slotHardware}`, '', env!.hardware.trim(), '');
  }
  if (env!.codingTools?.length) {
    lines.push(`### ${SCENARIO_JOURNEY_COPY.slotCoding}`, '');
    env!.codingTools.forEach((t) => {
      const link = t.url ? ` · ${t.url}` : '';
      lines.push(`- **${t.name}**${t.note ? `：${t.note}` : ''}${link}`);
    });
    lines.push('');
  }
  const models = [...(env!.cloudModels ?? []), ...(env!.localModels ?? [])];
  if (models.length) {
    lines.push(`### ${SCENARIO_JOURNEY_COPY.slotModels}`, '');
    models.forEach((m) => {
      const tag = m.kind === 'cloud' ? '云端' : '本地';
      lines.push(`- **[${tag}] ${m.name}**${m.note ? `：${m.note}` : ''}`);
    });
    lines.push('');
  }
  return lines.join('\n');
}
