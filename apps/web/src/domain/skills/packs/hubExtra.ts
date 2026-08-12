import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

function pack(
  partial: Omit<RunnableSkillPack, 'execSteps'> & { execSteps?: RunnableSkillPack['execSteps'] },
): RunnableSkillPack {
  return {
    ...partial,
    execSteps: partial.execSteps ?? planStepsToExecSteps(partial.planSteps, 'Skill'),
  };
}

/** Skill Hub 增补：本地化 / 文案 / 话术 / 沉淀 / 周报 / 竞品 / 渠道 / 邮件 */
export const HUB_EXTRA_SKILL_PACKS: RunnableSkillPack[] = [
  pack({
    id: 'skill-l10n-localize',
    agentType: 'marketing',
    planSteps: [
      '识别源语/目标语与物料类型（卖点卡/详情页）',
      '按术语表与禁译表完成初译',
      '回译抽检与规格数字校验',
      '输出双语对照包与质检清单',
    ],
    demoPrompt:
      '/本地化翻译 将以下卖点卡译为阿语，保留品牌词与规格数字，并给出术语质检清单（演示样例）。',
    instructions: `你是 MSS「小语种本地化翻译」Skill（/本地化翻译）。面向营销物料本地化，不是通用闲聊翻译。

## 必须输出
1. 目标语译文
2. 中英/源语对照表（关键句）
3. 术语与禁译检查结果
4. 需人工终审项
5. 局限说明（演示样例需标注）`,
    mockReport: `✅ **本地化翻译完成**（演示样例 · 阿语卖点卡）

### 译文要点
- 品牌词保留英文；容量/尺寸未改写
- 禁译词未触发

### 质检
| 项 | 结果 |
| --- | --- |
| 术语一致 | 通过 |
| 数字规格 | 通过 |
| 敏感表述 | 需人工抽检 10% |`,
  }),
  pack({
    id: 'skill-sales-copy',
    agentType: 'marketing',
    planSteps: [
      '澄清产品、人群与渠道触点',
      '提炼 3–5 条差异化卖点',
      '生成短文案与落地页段落',
      '给出 A/B 测试建议',
    ],
    demoPrompt: '/卖点文案 为穿戴新品生成电商详情页卖点（中国区 · 演示样例）。',
    instructions: `你是 MSS「卖点文案」Skill（/卖点文案）。参考专业营销 copy 框架，输出可落地的中文文案。

## 必须输出
1. 人群与场景假设
2. 卖点列表（利益点优先）
3. 主标题 / 副标题 / CTA
4. 详情页短段落
5. 合规提醒（医疗/绝对化用语）`,
    mockReport: `✅ **卖点文案已生成**（演示样例）

### 主标题
全天续航，运动更自由

### 卖点
1. 轻量化佩戴
2. 血氧与心率监测（演示口径）
3. 多场景表盘

### CTA
立即了解渠道主推机型`,
  }),
  pack({
    id: 'skill-frontline-script',
    agentType: 'knowledge',
    planSteps: [
      '识别场景（客诉/门店/热线）',
      '对齐 SOP 关键步骤',
      '生成可朗读统一话术',
      '列出禁忌语与升级条件',
    ],
    demoPrompt: '/一线话术 电池过热客诉，请给出一线统一口径与禁忌语（演示样例）。',
    instructions: `你是 MSS「一线话术」Skill（/一线话术）。输出可直接对客的口径，避免绝对化承诺。

## 必须输出
1. 场景与情绪安抚开场
2. 标准话术（分步）
3. 禁忌语
4. 升级条件
5. 引用的 SOP 要点（演示可标注样例）`,
    mockReport: `✅ **一线话术已生成**（演示样例 · 电池过热）

### 开场
非常理解您的担心，我们先确认设备状态并保障安全。

### 步骤话术
1. 确认机型与异常现象
2. 引导安全关机/停用
3. 登记工单并告知时限

### 禁忌
- 不承诺「绝对不会再发热」`,
  }),
  pack({
    id: 'skill-knowledge-digest',
    agentType: 'knowledge',
    planSteps: [
      '识别待沉淀材料类型',
      '抽取可检索要点与标签',
      '生成知识卡片摘要',
      '给出入库分区建议',
    ],
    demoPrompt: '/知识沉淀 将本周渠道复盘纪要沉淀为可检索知识卡片（演示样例）。',
    instructions: `你是 MSS「知识沉淀」Skill（/知识沉淀）。把长文变成可入库的知识卡片。

## 必须输出
1. 标题与摘要
2. 关键要点（条目）
3. 标签 / 分区建议
4. 引用原文片段（如有）
5. 待人工确认项`,
    mockReport: `✅ **知识卡片已生成**（演示样例）

### 标题
渠道周清 · 穿戴库存与主推对齐

### 要点
- 头部代表处库存健康
- 长尾机型需清库节奏

### 分区
\`gtm/channel-weekly\``,
  }),
  pack({
    id: 'skill-weekly-report',
    agentType: 'marketing',
    planSteps: [
      '对齐时间窗与口径（SO/SI）',
      '汇总代表处与品类结构',
      '提炼亮点/风险与归因',
      '输出周报成稿与 NBA',
    ],
    demoPrompt: '/经营周报 生成上周欧洲穿戴经营周报（演示样例）。',
    instructions: `你是 MSS「经营周报」Skill（/经营周报）。输出可直接发群的周清成稿。

## 必须输出
1. 时间窗与口径
2. 核心指标摘要
3. 亮点 / 风险
4. 归因 TOP3
5. 下周行动（NBA）`,
    mockReport: `✅ **经营周报已生成**（演示样例）

### 摘要
欧洲穿戴 SO 环比小幅上升；FR 结构需关注。

### NBA
- 对齐 FR 促销与库存
- 复盘 TOP3 异动渠道`,
  }),
  pack({
    id: 'skill-comp-brief',
    agentType: 'marketing',
    planSteps: [
      '锁定竞品型号与对比维度',
      '整理价格/卖点/渠道差异',
      '给出应对建议',
      '输出一页纸简报',
    ],
    demoPrompt: '/竞品简报 对比竞品手表 A 与我司主推机型（演示样例）。',
    instructions: `你是 MSS「竞品简报」Skill（/竞品简报）。输出一页纸对照，不编造未提供的精确价格。

## 必须输出
1. 对比范围
2. 维度表（价格/卖点/渠道）
3. 优劣势
4. 应对建议
5. 信息缺口`,
    mockReport: `✅ **竞品简报已生成**（演示样例）

### 对照
| 维度 | 我司 | 竞品 A |
| --- | --- | --- |
| 续航 | 优 | 中 |
| 生态 | 优 | 中 |

### 建议
强化续航与健康监测卖点沟通。`,
  }),
  pack({
    id: 'skill-channel-brief',
    agentType: 'marketing',
    planSteps: [
      '对齐活动档期与主推机型',
      '核对库存与渠道节奏',
      '输出作战要点',
      '列出协同角色与截止时间',
    ],
    demoPrompt: '/渠道简报 生成本周中国区渠道作战简报（演示样例）。',
    instructions: `你是 MSS「渠道简报」Skill（/渠道简报）。面向渠道经理的作战对齐材料。

## 必须输出
1. 本周主题
2. 主推与库存提醒
3. 活动节奏
4. 风险与协同人
5. 检查清单`,
    mockReport: `✅ **渠道简报已生成**（演示样例）

### 本周主题
穿戴清库 + 新品预热

### 清单
- 主推陈列到位
- 促销话术统一`,
  }),
  pack({
    id: 'skill-email-draft',
    agentType: 'knowledge',
    planSteps: [
      '明确收件人与沟通目的',
      '整理事实要点与诉求',
      '生成礼貌、简洁邮件草稿',
      '给出主题行备选',
    ],
    demoPrompt: '/邮件草稿 给渠道客户写一封补货跟进邮件（演示样例）。',
    instructions: `你是 MSS「邮件草稿」Skill（/邮件草稿）。输出可直接粘贴的商务邮件。

## 必须输出
1. 主题行（2 个备选）
2. 正文
3. 礼貌结尾
4. 需人工核对的事实项`,
    mockReport: `✅ **邮件草稿已生成**（演示样例）

### 主题
关于本周补货进度的确认

### 正文
您好，…（演示）恳请确认到货窗口。谢谢！`,
  }),
];
