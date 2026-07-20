import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

/** 电渠评论链路 · 评论分析（承接采集+翻译后的清洗语料） */

export const ORDER_REVIEW_SKILL_ID = 'skill-review-cluster';

export const ORDER_REVIEW_SKILL_INSTRUCTIONS = `你是 MSS 电渠「订单评论分析」Skill（/评论分析）。对**已采集并完成中英双语清洗**的订单评论做正向/负向情感判断与用户数据挖掘，输出可进例会的 VoC 行动建议。

## 在链路中的位置
评分采集 Agent（/评论采集）→ 语种翻译 Agent（/评论翻译）→ **本 Skill（评论分析）**

## 能力范围
- 输入优先：双语对照表（原文 + en + zh）或已清洗 JSON；其次才是原始粘贴评论
- 平台语境：Amazon / Lazada 等电渠订单评论（已购已用）
- 若无上游输出：可使用演示样例 ASIN B0FPG9431G，并明确标注「演示样例」

## 必须输出的结构（Markdown）
1. **报告概览**：产品、ASIN/SKU、站点、评论量、均星、数据来源（是否经采集/翻译）
2. **星级与核心指标**：1–5 星分布、好评率(4–5)、差评率(1–2)
3. **情感与观点**：正/中/负占比；负面 TOP3、正面 TOP3（主题、强度、**中英摘录+原文**）
4. **用户数据挖掘**：人群/场景假设、复购/退换意向信号、高频诉求词云要点
5. **卖点 GAP**：官方/常见卖点 vs 用户感知落差
6. **预警**：退换货意愿、集中质量问题、舆情升级风险
7. **行动建议**（分角色）：电商 Listing / 服务话术 / MKT 素材
8. **数据局限**：样本、翻译置信度、采集窗口

## 原则
- 情感判断以清洗后中英译文为主，争议点回看原文
- 高星评论也可能含痛点，勿只按星级下结论
- 不要编造精确到个位的虚假统计；样本不足时给定性并说明
- 合规：仅作合法市场与口碑分析用途`;

export const ORDER_REVIEW_PLAN_STEPS = [
  '确认已承接采集+翻译清洗语料（或演示样例）',
  '星级分布与正负向情感判断',
  '主题聚类与用户数据挖掘（诉求/场景/退换信号）',
  '卖点 GAP 与预警识别',
  '生成分角色行动建议（电商 / 服务 / MKT）',
] as const;

export function buildOrderReviewDemoPrompt(command = '/评论分析'): string {
  return `${command} 请基于 Amazon MX 演示样例 ASIN B0FPG9431G（假设已完成采集与中英翻译清洗），输出情感判断、用户数据挖掘、卖点 GAP、预警与分角色建议。`;
}

const ORDER_REVIEW_MOCK_REPORT = `✅ **订单评论分析已完成**（演示样例 · ASIN \`B0FPG9431G\` · 经采集→翻译清洗）

### 一、报告概览
| 项目 | 内容 |
| --- | --- |
| 站点 | Amazon.com.mx |
| 链路 | 评分采集 → 语种翻译 → 评论分析 |
| 情感 | 偏正面；差评集中少数主题 |

### 二、情感与观点（负面 TOP）
1. **运动/GPS 精度** — EN: GPS inaccurate / ZH: GPS 不够准（原文西语，建议复核）
2. **价格预期落差** — 售价敏感，Listing 需强化价值证明
3. **连接偶发** — 中性偏负，服务侧准备排查话术

### 三、用户数据挖掘
- 场景：户外运动 / 日常通知
- 信号：未见批量退换措辞；价格异议与功能预期落差并存

### 四、行动建议
- **电商**：Listing/A+ 补 GPS 场景说明
- **服务**：沉淀中英/西语 FAQ
- **MKT**：筛选高星长评作拥护者素材`;

export const ORDER_REVIEW_SKILL_PACK: RunnableSkillPack = {
  id: ORDER_REVIEW_SKILL_ID,
  instructions: ORDER_REVIEW_SKILL_INSTRUCTIONS,
  planSteps: [...ORDER_REVIEW_PLAN_STEPS],
  demoPrompt: buildOrderReviewDemoPrompt(),
  mockReport: ORDER_REVIEW_MOCK_REPORT,
  execSteps: planStepsToExecSteps([...ORDER_REVIEW_PLAN_STEPS], 'Review'),
  agentType: 'knowledge',
};
