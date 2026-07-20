import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

function pack(
  partial: Omit<RunnableSkillPack, 'execSteps'> & { execSteps?: RunnableSkillPack['execSteps'] },
): RunnableSkillPack {
  return {
    ...partial,
    execSteps: partial.execSteps ?? planStepsToExecSteps(partial.planSteps, 'Exp'),
  };
}

export const EXPERIENCE_SKILL_PACKS: RunnableSkillPack[] = [
  pack({
    id: 'skill-rag',
    agentType: 'knowledge',
    planSteps: [
      '提问重写与术语对齐',
      '按业务分区向量检索',
      '汇总候选文档块',
      '生成带引用的回答草稿',
    ],
    demoPrompt:
      '/检索 请基于演示样例知识库，回答：欧洲门店 DOS 过高时应按什么 SOP 处理？并给出引用。',
    instructions: `你是 MSS「企业知识检索」Skill（/检索）。按业务部门分区做向量检索演示。

## 必须输出
1. 改写后的查询
2. 命中文档列表（标题/分区/相关度定性）
3. 回答正文
4. 引用锚点
5. 未命中时的诚实说明
6. 标注演示样例`,
    mockReport: `✅ **知识检索完成**（演示样例 · 零售 SOP 分区）

### 改写查询
「门店 DOS 过高处理流程 / 欧洲零售」

### 命中
1. 《零售 DOS 异常处置 SOP》v1.2 — 相关度高
2. 《库存调拨指引》— 相关度中

### 回答摘要
1) 核对口径与系统延迟 → 2) 识别缺货/滞销 → 3) 发起调拨或促销清滞 → 4) 门店培训跟进。

### 引用
- [SOP §3.2] 演示锚点
- [调拨指引 §2] 演示锚点`,
  }),

  pack({
    id: 'skill-rerank',
    agentType: 'knowledge',
    planSteps: [
      '接收初检候选列表',
      'Cross-Encoder 语义重排',
      '截断 Top-K 并解释排序理由',
      '输出供摘要使用的精选块',
    ],
    demoPrompt:
      '/rerank 请基于演示样例，对 8 条检索候选重排为 Top-3，并说明排序理由。',
    instructions: `你是 MSS「检索重排序」Skill（/rerank）。

## 必须输出
1. 输入候选概览
2. Top-K 精选列表
3. 每条排序理由
4. 被降权样本说明
5. 建议是否进入摘要生成`,
    mockReport: `✅ **重排序完成**（演示样例 · Top-3）

| 排名 | 文档 | 理由 |
| --- | --- | --- |
| 1 | DOS 异常处置 SOP | 直接匹配流程问题 |
| 2 | 库存调拨指引 | 提供可执行动作 |
| 3 | 门店培训手册节选 | 补充一线话术 |

### 降权
- 品牌故事稿：语义偏营销，与处置流程弱相关

### 建议
可进入抗幻觉摘要生成。`,
  }),

  pack({
    id: 'skill-retail-coach',
    agentType: 'knowledge',
    planSteps: [
      '设定演练场景与考核点',
      '生成顾客异议与标准应答',
      '模拟一轮对话并评分',
      '输出改进建议与再练脚本',
    ],
    demoPrompt:
      '/陪练 请基于演示样例，开展一轮「价格贵」异议处理陪练：脚本、评分与改进建议。',
    instructions: `你是 MSS「零售 AI 陪练」Skill（/陪练）。

## 必须输出
1. 场景与考核点
2. 模拟对话（顾客/店员）
3. 维度评分
4. 改进建议
5. 再练 3 句金句`,
    mockReport: `✅ **陪练回合完成**（演示样例 · 价格异议）

### 场景
顾客认为新品定价偏高

### 模拟（节选）
- 顾客：比上一代贵不少…
- 店员：理解您的顾虑；这一代续航与…（演示）

### 评分
话术完整性 4/5 · 价值塑造 3/5 · 促成 3/5

### 改进
先共情再对比；补充官方活动/以旧换新钩子

### 金句
「贵在多两天续航和更稳的运动定位，按周均下来…」`,
  }),

  pack({
    id: 'skill-complaint-sop',
    agentType: 'knowledge',
    planSteps: [
      '识别客诉类型与紧急度',
      '匹配 SOP 与话术模板',
      '生成对客回复草稿',
      '列出升级路径与工单字段',
    ],
    demoPrompt:
      '/客诉 请基于演示样例，处理「物流延误」客诉：SOP 匹配、对客话术与是否升级。',
    instructions: `你是 MSS「客诉 SOP 匹配」Skill（/客诉）。

## 必须输出
1. 客诉分类与紧急度
2. 匹配 SOP 条款
3. 对客话术（多语种可选）
4. 内部动作/升级条件
5. 工单建议字段
6. 演示样例声明`,
    mockReport: `✅ **客诉 SOP 匹配完成**（演示样例 · 物流延误）

### 分类
- 类型：履约时效
- 紧急度：中

### 匹配
《CSC 物流延误处置 SOP》§2.1（演示）

### 对客话术
非常抱歉延误给您带来不便；当前物流节点为…；预计…前送达；可提供…补偿选项（演示）。

### 升级条件
超过承诺时效 48h 仍无更新 → 升级二线

### 工单字段
订单号 / 延误时长 / 补偿意向`,
  }),

  pack({
    id: 'skill-wecom',
    agentType: 'marketing',
    planSteps: [
      '确认推送对象与消息类型',
      '组装卡片/文本内容',
      '校验敏感信息与频率',
      '输出推送预览与发送清单',
    ],
    demoPrompt:
      '/wecom 请基于演示样例，生成一条经营周报企业微信卡片推送预览（标题、要点、按钮）。',
    instructions: `你是 MSS「企业微信推送」Skill（/wecom）。演示环境只生成推送预览，不真实调用 WeCom API。

## 必须输出
1. 推送对象与通道
2. 消息类型（文本/卡片）
3. 标题与要点
4. 按钮/链接占位
5. 合规与频率检查
6. 明确「演示未真实发送」`,
    mockReport: `✅ **WeCom 推送预览**（演示样例 · 未真实发送）

### 通道
群机器人 · 区域经营群（演示）

### 卡片
- 标题：欧洲穿戴周报（演示）
- 要点：SO 环比上升；南欧 DOS 风险；3 条行动项
- 按钮：查看详情（占位链接）

### 检查
- 无 PII
- 本周同类推送 ≤ 1 次（建议）

> 演示模式：仅预览，未调用企业微信 API。`,
  }),
];
