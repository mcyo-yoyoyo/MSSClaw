import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

/** 电渠评论链路 · 语种翻译 */

export const REVIEW_TRANSLATE_SKILL_ID = 'skill-review-translate';

export const REVIEW_TRANSLATE_SKILL_INSTRUCTIONS = `你是 MSS 电渠「语种翻译」Skill（/评论翻译）。将上游采集的多语种订单评论统一翻译为**英语 + 中文**，保留原文，供评论分析使用。

## 能力范围
- 输入：评分采集 Agent 输出的样本清单 / 用户粘贴的多语种评论
- 目标语：English（en）与 简体中文（zh-CN）
- 源语：西语/英语/东南亚语种等（识别不到则标 unknown）
- 若无真实样本：承接演示样例 ASIN B0FPG9431G 的采集输出，并标注「演示样例」

## 必须输出的结构（Markdown）
1. **翻译任务卡**：来源 ASIN/站点、条数、源语分布
2. **双语对照表**：序号 | 星级 | 原文 | 英语译文 | 中文译文 | 置信度（高/中/低）
3. **术语与专名**：品牌/SKU/功能词保持一致（如 GPS、ASIN）
4. **质量备注**：谐音梗、脏话、无法直译处标注「建议人工复核」
5. **交接给下游**：明确可交给「评论分析 Agent」的清洗后语料

## 原则
- **必须保留原文**，译文与原文成对出现
- 不在本 Skill 内做情感聚类或卖点 GAP（留给评论分析）
- 低置信度译文不得伪装成精确；演示样例须标注`;

export const REVIEW_TRANSLATE_PLAN_STEPS = [
  '接收采集样本并识别源语分布',
  '逐条译为英语与中文并保留原文',
  '统一术语/专名，标注低置信度行',
  '输出双语对照表并交接给分析链路',
] as const;

export function buildReviewTranslateDemoPrompt(command = '/评论翻译'): string {
  return `${command} 请将 Amazon MX 演示样例 ASIN B0FPG9431G 的多语种订单评论统一翻译为英语和中文，输出双语对照表（保留原文），并标注演示样例。`;
}

const REVIEW_TRANSLATE_MOCK_REPORT = `✅ **语种翻译已完成**（演示样例 · ASIN \`B0FPG9431G\`）

### 一、任务卡
- 源语：es-MX 为主 · 目标：en + zh-CN
- 条数：演示批次 12 条

### 二、双语对照（节选）
| # | 原文 | EN | ZH |
| --- | --- | --- | --- |
| 1 | Es muy bueno… pero el GPS es poco preciso. | Nice design, but GPS is inaccurate. | 外观不错，但 GPS 不够准。 |
| 2 | La batería dura todo el día. | Battery lasts all day. | 续航能撑一整天。 |

### 三、交接
请将双语对照表交给 **评论分析 Agent**（/评论分析）做情感判断与用户洞察挖掘。`;

export const REVIEW_TRANSLATE_SKILL_PACK: RunnableSkillPack = {
  id: REVIEW_TRANSLATE_SKILL_ID,
  instructions: REVIEW_TRANSLATE_SKILL_INSTRUCTIONS,
  planSteps: [...REVIEW_TRANSLATE_PLAN_STEPS],
  demoPrompt: buildReviewTranslateDemoPrompt(),
  mockReport: REVIEW_TRANSLATE_MOCK_REPORT,
  execSteps: planStepsToExecSteps([...REVIEW_TRANSLATE_PLAN_STEPS], 'Translate'),
  agentType: 'knowledge',
};
