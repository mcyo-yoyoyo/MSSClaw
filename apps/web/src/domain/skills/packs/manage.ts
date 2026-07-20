import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';
import { ORDER_REVIEW_SKILL_PACK } from '@/domain/skills/orderReviewSkill';
import { REVIEW_COLLECT_SKILL_PACK } from '@/domain/skills/reviewCollectSkill';
import { REVIEW_TRANSLATE_SKILL_PACK } from '@/domain/skills/reviewTranslateSkill';

function pack(
  partial: Omit<RunnableSkillPack, 'execSteps'> & { execSteps?: RunnableSkillPack['execSteps'] },
): RunnableSkillPack {
  return {
    ...partial,
    execSteps: partial.execSteps ?? planStepsToExecSteps(partial.planSteps, 'Manage'),
  };
}

const OTHER_MANAGE_PACKS: RunnableSkillPack[] = [
  pack({
    id: 'skill-launch-sentiment',
    agentType: 'marketing',
    planSteps: [
      '界定产品/发布会与监测窗口',
      '聚合社媒与媒体声量',
      '情感分层与热点主题聚类',
      '输出快报与危机/机会建议',
    ],
    demoPrompt:
      '/舆情快报 请基于演示样例，输出某穿戴新品发布会 48h 舆情快报：声量、情感、热点与建议。',
    instructions: `你是 MSS「发布会舆情快报」Skill（/舆情快报）。

## 必须输出
1. 监测范围与窗口
2. 声量与情感概览
3. 热点主题 TOP5（含代表性原声）
4. 风险与机会
5. 给 PR/MKT/服务的建议
6. 数据局限（标注演示样例）`,
    mockReport: `✅ **舆情快报已完成**（演示样例 · 穿戴新品发布 48h）

### 概览
- 声量：中等偏高（演示指数）
- 情感：正 62% / 中 25% / 负 13%

### 热点 TOP
1. 续航表现 — 正面居多
2. 价格讨论 — 中性偏负
3. 配色与设计 — 正面

### 建议
- PR：放大续航 KOL 原声
- MKT：价格异议准备对比素材
- 服务：备好开箱/配对 FAQ`,
  }),

  pack({
    id: 'skill-survey-insight',
    agentType: 'marketing',
    planSteps: [
      '确认问卷主题与样本说明',
      '清洗与分层（人群/区域）',
      '交叉分析关键题项',
      '输出洞察与行动建议',
    ],
    demoPrompt:
      '/问卷洞察 请基于演示样例，分析用户满意度问卷：NPS、痛点 TOP、分人群差异与建议。',
    instructions: `你是 MSS「问卷洞察」Skill（/问卷洞察）。

## 必须输出
1. 样本与题项概览
2. 核心指标（NPS/满意度等，演示可给区间）
3. 痛点 / 亮点 TOP
4. 分人群差异
5. 行动建议（MKT/产品/服务）
6. 局限`,
    mockReport: `✅ **问卷洞察已完成**（演示样例 · 满意度调研）

### 样本
n≈800（演示）；区域含 EU/APAC

### 核心指标
- NPS：约 32～38（演示区间）
- 满意度：偏正面

### 痛点 TOP
1. 物流时效
2. 包装说明不够本地化

### 建议
- 服务：强化物流节点通知
- MKT：包装内页多语种改版试点`,
  }),

  pack({
    id: 'skill-retail-insight',
    agentType: 'marketing',
    planSteps: [
      '选定门店范围与指标（DOS/转化/陈列）',
      '拉取并校验零售数据口径',
      '识别异常门店与机会门店',
      '生成洞察 π 报告与动作清单',
    ],
    demoPrompt:
      '/零售洞察 请基于演示样例，输出 3 月代表处 DOS/转化洞察：异常门店、原因假设与动作。',
    instructions: `你是 MSS「零售信息洞察 π」Skill（/零售洞察）。

## 必须输出
1. 范围与口径
2. DOS / 转化核心表
3. 异常门店清单
4. 原因假设
5. 动作建议（零售/供应/培训）
6. 局限`,
    mockReport: `✅ **零售洞察 π 已完成**（演示样例 · 3 月 DOS）

### 核心发现
- 整体 DOS 可控；南欧 12 家门店 DOS 偏高
- 高转化门店集中在 DE 核心商圈

### 异常门店（节选）
| 门店 | DOS | 假设 |
| --- | --- | --- |
| IT-021 | 高 | 畅销色缺货 + 陈列老化 |

### 动作
- 补货 + 陈列换新培训
- 复制 DE 高转化话术到 IT`,
  }),

  pack({
    id: 'skill-price-monitor',
    agentType: 'marketing',
    planSteps: [
      '确认监测国家、渠道与 SKU 清单',
      '聚合价格与 offer 变化',
      '识别异常降价/窜货信号',
      '输出监测简报与跟进建议',
    ],
    demoPrompt:
      '/价格监测 请基于演示样例，输出 18 国中选 3 国穿戴主力 SKU 的价格与 offer 监测简报。',
    instructions: `你是 MSS「价格与 Offer 监测」Skill（/价格监测）。

## 必须输出
1. 监测范围（国家/渠道/SKU）
2. 价格带与周变化
3. 异常告警（降价幅度/窜货嫌疑）
4. Offer 变化（赠品/满减）
5. 给电商/渠道的建议
6. 标注演示样例与数据局限`,
    mockReport: `✅ **价格监测简报**（演示样例 · DE/UK/MX）

### 价格带
| 国家 | 渠道 | 主力 SKU | 价格变化 |
| --- | --- | --- | --- |
| DE | 官方商城 | W-01 | 持平 |
| UK | 第三方 | W-01 | -4%（演示） |
| MX | Amazon | W-02 | +2% |

### 告警
- UK 第三方降价需核实是否授权促销

### 建议
- 电商：核对授权价盘
- 渠道：同步官方活动日历`,
  }),

  pack({
    id: 'skill-so-report',
    agentType: 'marketing',
    planSteps: [
      '确认统计周期与剔除规则（如 IoT）',
      '汇总代表处 SO/SI 与排名',
      '计算环比与结构占比',
      '生成报表结论与跟进项',
    ],
    demoPrompt:
      '/so报表 请基于演示样例，输出各代表处累计 SO 排名（剔除 IoT），含环比与简要结论。',
    instructions: `你是 MSS「SO/SI 报表」Skill（/so报表）。

## 必须输出
1. 口径（周期、剔除规则）
2. 代表处排名表
3. 环比亮点/落后点
4. 结构说明（品类）
5. 跟进建议
6. 数据局限`,
    mockReport: `✅ **SO 报表已生成**（演示样例 · 累计 SO · 剔除 IoT）

### 排名（节选）
| 名次 | 代表处 | SO | 环比 |
| --- | --- | --- | --- |
| 1 | DE | 高 | +5% |
| 2 | UK | 高 | +3% |
| 3 | FR | 中 | -1% |

### 结论
头部稳定；FR 需关注穿戴结构下滑（演示）。

### 跟进
- 与 FR 对齐促销与库存`,
  }),
];

export const MANAGE_SKILL_PACKS: RunnableSkillPack[] = [
  ...OTHER_MANAGE_PACKS,
  REVIEW_COLLECT_SKILL_PACK,
  REVIEW_TRANSLATE_SKILL_PACK,
  ORDER_REVIEW_SKILL_PACK,
];
