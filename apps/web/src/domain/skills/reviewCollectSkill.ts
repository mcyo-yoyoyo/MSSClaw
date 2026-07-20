import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

/** 电渠评论链路 · 评分采集 */

export const REVIEW_COLLECT_SKILL_ID = 'skill-review-collect';

export const REVIEW_COLLECT_SKILL_INSTRUCTIONS = `你是 MSS 电渠「评分采集」Skill（/评论采集）。从电商平台商品购买页采集用户订单评论（已购已用），输出可交给下游翻译/分析的干净样本包。

## 能力范围
- 平台：Amazon（含 MX/US/DE 等站点）、Lazada 等电渠购买页
- 典型输入：商品 URL / ASIN / itemId、品类（如 3C 穿戴）、目标评论量、站点国家
- 采集对象：星级、标题、正文、语种线索、Verified Purchase、发布时间（可得则保留）
- 若无真实抓取权限：使用演示样例 ASIN B0FPG9431G（Amazon MX），并标注「演示样例」

## 必须输出的结构（Markdown）
1. **采集任务卡**：平台、站点、ASIN/SKU、品类、目标条数、时间窗
2. **采集结果概览**：实际条数、星级粗分布、语种粗分、Verified 占比（未知则注明）
3. **样本清单表**（至少 8～15 条演示行）：序号 | 星级 | 语种 | 原文摘要 | Verified | 日期
4. **质量与缺口**：重复/空评/疑似刷评、未采到字段、建议补采
5. **交接给下游**：明确可交给「语种翻译 Agent」的字段清单

## 原则
- 只采集合法公开的购买页评论，不做登录绕过或违规抓取说明
- 保留原文，不在本 Skill 内做翻译或深度情感分析
- 不要编造精确到个位的虚假统计；演示样例须标注`;

export const REVIEW_COLLECT_PLAN_STEPS = [
  '确认平台/站点/ASIN 与目标评论量',
  '拉取购买页订单评论并去重清洗',
  '输出星级/语种粗分与样本清单',
  '标注质量缺口并交接给翻译链路',
] as const;

export function buildReviewCollectDemoPrompt(command = '/评论采集'): string {
  return `${command} 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C 穿戴）购买页订单评论，输出任务卡、样本清单（含星级/语种/原文摘要）与交接说明，标注演示样例。`;
}

const REVIEW_COLLECT_MOCK_REPORT = `✅ **评分采集已完成**（演示样例 · ASIN \`B0FPG9431G\` · Amazon MX）

### 一、采集任务卡
| 项目 | 内容 |
| --- | --- |
| 平台/站点 | Amazon.com.mx |
| 品类 | 3C 穿戴 |
| 目标 | 近 90 天订单评论 · 演示批次 12 条 |

### 二、概览
- 星级粗分：偏正面；1–2 星约占少数
- 语种粗分：es-MX 为主，夹杂 en
- Verified：演示样本多数为已购标记

### 三、样本清单（节选）
| # | 星 | 语种 | 原文摘要 |
| --- | --- | --- | --- |
| 1 | 4 | es | GPS 场景有落差，外观好评 |
| 2 | 5 | es | 续航与设计满意 |
| 3 | 3 | en | 连接偶发不稳定 |

### 四、交接
请将样本清单交给 **语种翻译 Agent**（/评论翻译），统一产出中英双语后再进入评论分析。`;

export const REVIEW_COLLECT_SKILL_PACK: RunnableSkillPack = {
  id: REVIEW_COLLECT_SKILL_ID,
  instructions: REVIEW_COLLECT_SKILL_INSTRUCTIONS,
  planSteps: [...REVIEW_COLLECT_PLAN_STEPS],
  demoPrompt: buildReviewCollectDemoPrompt(),
  mockReport: REVIEW_COLLECT_MOCK_REPORT,
  execSteps: planStepsToExecSteps([...REVIEW_COLLECT_PLAN_STEPS], 'Collect'),
  agentType: 'knowledge',
};
