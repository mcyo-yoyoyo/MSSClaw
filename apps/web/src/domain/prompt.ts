import { z } from 'zod';

export const PromptLifecycleSchema = z.enum([
  'draft',
  'testing',
  'approved',
  'released',
  'deprecated',
]);
export type PromptLifecycle = z.infer<typeof PromptLifecycleSchema>;

export const PromptVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});
export type PromptVariable = z.infer<typeof PromptVariableSchema>;

export const PromptVersionSchema = z.object({
  version: z.string(),
  lifecycle: PromptLifecycleSchema,
  updatedAt: z.string(),
  author: z.string(),
  changelog: z.string(),
});
export type PromptVersion = z.infer<typeof PromptVersionSchema>;

export const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  template: z.string(),
  variables: z.array(PromptVariableSchema),
  lifecycle: PromptLifecycleSchema,
  updatedAt: z.string(),
  author: z.string(),
  evaluationScore: z.number().optional(),
  tags: z.array(z.string()),
  versions: z.array(PromptVersionSchema),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const PROMPT_LIFECYCLE_FLOW: PromptLifecycle[] = [
  'draft',
  'testing',
  'approved',
  'released',
  'deprecated',
];

export const PROMPT_CATALOG: Record<string, Prompt[]> = {
  'ws-3c-latam': [
    {
      id: 'prompt-qa-strict',
      name: 'ENTERPRISE_QA_STRICT',
      version: 'v3',
      description: '抗幻觉企业问答模板，强制基于引用文献回答。',
      template: `你是 MSS Claw 企业知识助手。请严格基于以下上下文回答，不得编造。

<context>
{{context}}
</context>

用户问题：{{query}}

要求：
1. 仅使用 context 中的信息
2. 无法回答时明确说明
3. 使用 [n] 标注引用`,
      variables: [
        { name: 'context', type: 'string', required: true, description: 'RAG 召回文档块' },
        { name: 'query', type: 'string', required: true, description: '用户原始问题' },
      ],
      lifecycle: 'released',
      updatedAt: '2026-07-01',
      author: 'Mcyo',
      evaluationScore: 0.94,
      tags: ['rag', 'compliance', 'no-hallucination'],
      versions: [
        { version: 'v3', lifecycle: 'released', updatedAt: '2026-07-01', author: 'Mcyo', changelog: '强化引用格式约束' },
        { version: 'v2', lifecycle: 'deprecated', updatedAt: '2026-05-12', author: 'Mcyo', changelog: '增加拒答策略' },
        { version: 'v1', lifecycle: 'deprecated', updatedAt: '2026-03-08', author: 'Mcyo', changelog: '初始版本' },
      ],
    },
    {
      id: 'prompt-marketing-attribution',
      name: 'MARKETING_ATTRIBUTION_BRIEF',
      version: 'v1',
      description: '营销异动归因分析输出结构模板。',
      template: `分析以下销售异动并输出结构化报告：

区域：{{region}}
品类：{{category}}
时间范围：{{period}}

输出 JSON：{ root_causes[], nba_actions[], confidence }`,
      variables: [
        { name: 'region', type: 'string', required: true, defaultValue: 'EU' },
        { name: 'category', type: 'string', required: true, defaultValue: 'Smartphone' },
        { name: 'period', type: 'string', required: true, defaultValue: 'Q3' },
      ],
      lifecycle: 'approved',
      updatedAt: '2026-06-20',
      author: 'Bruce',
      evaluationScore: 0.88,
      tags: ['marketing', 'shap', 'nba'],
      versions: [
        { version: 'v1', lifecycle: 'approved', updatedAt: '2026-06-20', author: 'Bruce', changelog: '首版归因结构' },
      ],
    },
    {
      id: 'prompt-warroom-summary',
      name: 'WARROOM_DAILY_SUMMARY',
      version: 'v2',
      description: '联合作战 WarRoom 日报摘要 Prompt。',
      template: `汇总以下群聊与 Agent 输出，生成 WarRoom 日报：

<messages>{{messages}}</messages>

格式：风险 / 进展 / 待决策 / 明日动作`,
      variables: [{ name: 'messages', type: 'string', required: true, description: '群聊消息聚合' }],
      lifecycle: 'testing',
      updatedAt: '2026-07-05',
      author: 'Jacky',
      tags: ['warroom', 'summary'],
      versions: [
        { version: 'v2', lifecycle: 'testing', updatedAt: '2026-07-05', author: 'Jacky', changelog: '增加待决策段' },
        { version: 'v1', lifecycle: 'draft', updatedAt: '2026-06-28', author: 'Jacky', changelog: '草稿' },
      ],
    },
  ],
  'ws-global-marketing': [
    {
      id: 'prompt-campaign-brief',
      name: 'CAMPAIGN_BRIEF_GENERATOR',
      version: 'v2',
      description: '跨区域 Campaign Brief 自动生成。',
      template: `为 {{region}} 区域 {{product_line}} 生成 Campaign Brief。

目标 KPI：{{kpi}}
预算上限：{{budget}}

输出：目标人群 / 核心信息 / 渠道组合 / 风险`,
      variables: [
        { name: 'region', type: 'string', required: true },
        { name: 'product_line', type: 'string', required: true },
        { name: 'kpi', type: 'string', required: true },
        { name: 'budget', type: 'string', required: true },
      ],
      lifecycle: 'released',
      updatedAt: '2026-06-15',
      author: 'Sarah',
      evaluationScore: 0.91,
      tags: ['campaign', 'global'],
      versions: [
        { version: 'v2', lifecycle: 'released', updatedAt: '2026-06-15', author: 'Sarah', changelog: '加入预算约束' },
        { version: 'v1', lifecycle: 'deprecated', updatedAt: '2026-04-01', author: 'Sarah', changelog: '初始版' },
      ],
    },
    {
      id: 'prompt-roi-compare',
      name: 'ROI_CROSS_REGION_COMPARE',
      version: 'v1',
      description: '跨区域 ROI 对比分析 Prompt。',
      template: `对比 {{regions}} 近 {{days}} 天 Campaign ROI，输出表格与结论。`,
      variables: [
        { name: 'regions', type: 'array', required: true, defaultValue: 'NA,EMEA,APAC' },
        { name: 'days', type: 'number', required: true, defaultValue: '30' },
      ],
      lifecycle: 'draft',
      updatedAt: '2026-07-07',
      author: 'Sarah',
      tags: ['roi', 'analytics'],
      versions: [
        { version: 'v1', lifecycle: 'draft', updatedAt: '2026-07-07', author: 'Sarah', changelog: '草稿创建' },
      ],
    },
  ],
  'ws-rd-knowledge': [
    {
      id: 'prompt-spec-compare',
      name: 'SPEC_COMPARE_STRICT',
      version: 'v1',
      description: '产品规格对比，仅引用规格书字段。',
      template: `对比以下规格书片段，输出差异表：

<spec_a>{{spec_a}}</spec_a>
<spec_b>{{spec_b}}</spec_b>

维度：{{dimensions}}`,
      variables: [
        { name: 'spec_a', type: 'string', required: true },
        { name: 'spec_b', type: 'string', required: true },
        { name: 'dimensions', type: 'array', required: false, defaultValue: '影像,续航,散热' },
      ],
      lifecycle: 'approved',
      updatedAt: '2026-05-30',
      author: 'RD-Team',
      evaluationScore: 0.89,
      tags: ['spec', 'rd'],
      versions: [
        { version: 'v1', lifecycle: 'approved', updatedAt: '2026-05-30', author: 'RD-Team', changelog: '首版' },
      ],
    },
  ],
};

export function getPromptsByWorkspace(workspaceId: string): Prompt[] {
  return (
    PROMPT_CATALOG[workspaceId] ??
    PROMPT_CATALOG['ws-cn-marketing'] ??
    PROMPT_CATALOG['ws-3c-latam'] ??
    []
  );
}

export function findPromptByName(workspaceId: string, name: string): Prompt | undefined {
  return getPromptsByWorkspace(workspaceId).find((p) => p.name === name);
}

export function findPromptById(workspaceId: string, id: string): Prompt | undefined {
  return getPromptsByWorkspace(workspaceId).find((p) => p.id === id);
}

export function getLifecycleLabel(lifecycle: PromptLifecycle) {
  const labels: Record<PromptLifecycle, string> = {
    draft: 'Draft',
    testing: 'Testing',
    approved: 'Approved',
    released: 'Released',
    deprecated: 'Deprecated',
  };
  return labels[lifecycle];
}

export function getLifecycleClass(lifecycle: PromptLifecycle) {
  const classes: Record<PromptLifecycle, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    testing: 'bg-blue-50 text-blue-600 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    released: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    deprecated: 'bg-amber-50 text-amber-600 border-amber-200',
  };
  return classes[lifecycle];
}

export function getNextLifecycle(current: PromptLifecycle): PromptLifecycle | null {
  const idx = PROMPT_LIFECYCLE_FLOW.indexOf(current);
  if (idx < 0 || idx >= PROMPT_LIFECYCLE_FLOW.length - 1) return null;
  return PROMPT_LIFECYCLE_FLOW[idx + 1];
}

export function getLifecycleActionLabel(current: PromptLifecycle): string | null {
  const next = getNextLifecycle(current);
  if (!next) return null;
  const actions: Partial<Record<PromptLifecycle, string>> = {
    testing: '提交测试',
    approved: '审批通过',
    released: '发布上线',
    deprecated: '标记废弃',
  };
  return actions[next] ?? `推进至 ${getLifecycleLabel(next)}`;
}
