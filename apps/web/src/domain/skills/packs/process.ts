import type { RunnableSkillPack } from '@/domain/skills/types';
import { planStepsToExecSteps } from '@/domain/skills/types';

function pack(
  partial: Omit<RunnableSkillPack, 'execSteps'> & { execSteps?: RunnableSkillPack['execSteps'] },
): RunnableSkillPack {
  return {
    ...partial,
    execSteps: partial.execSteps ?? planStepsToExecSteps(partial.planSteps, 'Process'),
  };
}

export const PROCESS_SKILL_PACKS: RunnableSkillPack[] = [
  pack({
    id: 'skill-jd-parser',
    agentType: 'knowledge',
    planSteps: [
      '识别岗位与职级信息',
      '抽取职责、要求与胜任力标签',
      '结构化为招聘标准字段',
      '输出筛选权重建议',
    ],
    demoPrompt:
      '/jd解析 请基于演示样例，解析「区域电商运营」JD：职责、硬性要求、胜任力与筛选权重。',
    instructions: `你是 MSS「JD 解析」Skill（/jd解析）。

## 必须输出
1. 岗位元信息
2. 职责列表
3. 硬性/加分要求
4. 胜任力标签
5. 建议筛选权重
6. 待 HR 确认项`,
    mockReport: `✅ **JD 解析完成**（演示样例 · 区域电商运营）

### 元信息
- 职级：中级（演示）
- 汇报：电商主管

### 硬性要求
- 3 年电商运营
- 英语工作沟通

### 胜任力
数据分析 / 促销策划 / 跨部门协同

### 筛选权重建议
硬性 40% · 项目经验 35% · 软技能 25%`,
  }),

  pack({
    id: 'skill-resume-screen',
    agentType: 'knowledge',
    planSteps: [
      '对齐 JD 关键要求',
      '解析简历经历与成果',
      '人岗匹配打分与风险点',
      '输出面试关注清单',
    ],
    demoPrompt:
      '/简历筛选 请基于演示样例，对 1 份电商运营简历做人岗匹配：得分、亮点、风险、面试问题。',
    instructions: `你是 MSS「简历筛选」Skill（/简历筛选）。

## 必须输出
1. 匹配总分与分项
2. 亮点
3. 风险/缺口
4. 建议结论（推进/待定/淘汰）
5. 面试问题 5 条
6. 声明：辅助决策，非录用决定`,
    mockReport: `✅ **简历筛选完成**（演示样例）

### 匹配
- 总分：78/100（演示）
- 经验匹配高；英语证明弱

### 亮点
- 主导过跨境大促

### 风险
- 近两年跳槽偏频

### 结论
建议推进一面

### 面试问题（节选）
1. 描述一次大促 ROI 复盘
2. 如何处理渠道价格冲突`,
  }),

  pack({
    id: 'skill-interview-analysis',
    agentType: 'knowledge',
    planSteps: [
      '整理面试记录与评价维度',
      '提取行为事例与能力证据',
      '生成评估报告与录用建议倾向',
      '列出待核实背景调查点',
    ],
    demoPrompt:
      '/面试分析 请基于演示样例面试记录，输出评估报告：维度得分、证据、倾向建议。',
    instructions: `你是 MSS「面试分析」Skill（/面试分析）。

## 必须输出
1. 候选人与轮次
2. 维度评分表
3. 关键行为证据
4. 倾向建议（含理由）
5. 待核实项
6. 非最终录用决定声明`,
    mockReport: `✅ **面试评估报告**（演示样例 · 一面）

### 维度
| 维度 | 得分 |
| --- | --- |
| 专业 | 4/5 |
| 协同 | 3/5 |
| 抗压 | 4/5 |

### 证据
- 清晰讲述大促库存协同案例

### 倾向
建议进入二面；补充英语场景题

### 待核实
- 上一段离职原因`,
  }),

  pack({
    id: 'skill-training-gen',
    agentType: 'knowledge',
    planSteps: [
      '确认产品/受众与课时',
      '设计学习目标与大纲',
      '生成讲义要点与测验题',
      '输出门店演练脚本',
    ],
    demoPrompt:
      '/培训内容 请基于演示样例，生成 Nova 新品门店 45 分钟培训大纲、测验与演练脚本。',
    instructions: `你是 MSS「培训内容生成」Skill（/培训内容）。

## 必须输出
1. 学习目标
2. 课时大纲
3. 讲义要点
4. 测验题（含参考答案）
5. 门店演练脚本
6. 培训后跟踪建议`,
    mockReport: `✅ **培训内容已生成**（演示样例 · Nova 新品 · 45min）

### 学习目标
- 说清 3 个核心卖点与竞品差异
- 完成一次标准演示话术

### 大纲
1. 产品定位（10'）
2. 卖点演示（15'）
3. 异议处理（10'）
4. 演练与测验（10'）

### 测验（节选）
Q1：续航卖点应如何表述？（参考：场景化 + 对比）

### 演练脚本
店员 A 演示 → 店员 B 扮演顾虑价格顾客 → 反馈 2 条改进。`,
  }),
];
