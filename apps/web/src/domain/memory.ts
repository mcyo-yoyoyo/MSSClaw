import { z } from 'zod';

export const MemoryLayerSchema = z.enum([
  'conversation',
  'session',
  'workspace',
  'agent',
  'long',
  'semantic',
]);
export type MemoryLayer = z.infer<typeof MemoryLayerSchema>;

export const MemoryScopeSchema = z.enum(['conversation', 'session', 'workspace', 'agent']);
export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

export const MemoryStoreStatusSchema = z.enum(['active', 'archived', 'syncing']);
export type MemoryStoreStatus = z.infer<typeof MemoryStoreStatusSchema>;

export const MemoryEntrySchema = z.object({
  id: z.string(),
  layer: MemoryLayerSchema,
  content: z.string(),
  source: z.string(),
  importance: z.number().min(0).max(1),
  decayScore: z.number().min(0).max(1),
  tokenCount: z.number(),
  createdAt: z.string(),
  lastAccessed: z.string(),
  tags: z.array(z.string()),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const LayerPolicySchema = z.object({
  layer: MemoryLayerSchema,
  retentionDays: z.number(),
  maxTokens: z.number(),
  reflectionEnabled: z.boolean(),
  decayRate: z.number(),
});
export type LayerPolicy = z.infer<typeof LayerPolicySchema>;

export const ReflectionLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  summary: z.string(),
  promoted: z.number(),
  pruned: z.number(),
});
export type ReflectionLog = z.infer<typeof ReflectionLogSchema>;

export const MemoryStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  scope: MemoryScopeSchema,
  status: MemoryStoreStatusSchema,
  boundAgentId: z.string().optional(),
  boundAgentName: z.string().optional(),
  boundChatId: z.string().optional(),
  policies: z.array(LayerPolicySchema),
  entries: z.array(MemoryEntrySchema),
  reflectionLogs: z.array(ReflectionLogSchema),
  totalTokens: z.number(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
});
export type MemoryStore = z.infer<typeof MemoryStoreSchema>;

export const MEMORY_LAYER_FLOW: { id: MemoryLayer; label: string; icon: string; desc: string }[] = [
  { id: 'conversation', label: '对话', icon: 'fa-comments', desc: '单轮对话上下文' },
  { id: 'session', label: '会话', icon: 'fa-clock', desc: '会话级短期记忆' },
  { id: 'workspace', label: '工作区', icon: 'fa-building', desc: '租户共享上下文' },
  { id: 'agent', label: 'Agent', icon: 'fa-robot', desc: 'Agent 专属记忆池' },
  { id: 'long', label: '长期', icon: 'fa-book', desc: '跨会话长期记忆' },
  { id: 'semantic', label: '语义', icon: 'fa-brain', desc: '向量化语义记忆' },
];

export const SCOPE_LABELS: Record<MemoryScope, string> = {
  conversation: '对话',
  session: '会话',
  workspace: '工作区',
  agent: 'Agent',
};

const DEFAULT_POLICIES: LayerPolicy[] = [
  { layer: 'conversation', retentionDays: 1, maxTokens: 8_000, reflectionEnabled: false, decayRate: 0.9 },
  { layer: 'session', retentionDays: 7, maxTokens: 32_000, reflectionEnabled: true, decayRate: 0.7 },
  { layer: 'workspace', retentionDays: 90, maxTokens: 128_000, reflectionEnabled: true, decayRate: 0.4 },
  { layer: 'agent', retentionDays: 180, maxTokens: 64_000, reflectionEnabled: true, decayRate: 0.3 },
  { layer: 'long', retentionDays: 365, maxTokens: 256_000, reflectionEnabled: true, decayRate: 0.15 },
  { layer: 'semantic', retentionDays: 730, maxTokens: 512_000, reflectionEnabled: true, decayRate: 0.05 },
];

const MARKETING_AGENT_MEMORY: MemoryStore = {
  id: 'mem-marketing-agent',
  name: 'marketing_agent_memory',
  description: '营销 Agent 分层记忆 · Q3 归因 / 竞品 / 用户偏好',
  scope: 'agent',
  status: 'active',
  boundAgentId: 'agent-marketing',
  boundAgentName: '营销 Agent',
  policies: DEFAULT_POLICIES,
  totalTokens: 48_200,
  updatedAt: '2026-07-08',
  tags: ['marketing', 'attribution', 'latam'],
  entries: [
    {
      id: 'e1',
      layer: 'session',
      content: '用户关注拉美 Wearable 品类 Q3 同比 -12%，需归因到竞品促销与渠道结构',
      source: 'WarRoom 群聊',
      importance: 0.92,
      decayScore: 0.15,
      tokenCount: 42,
      createdAt: '2026-07-08 13:20',
      lastAccessed: '刚刚',
      tags: ['attribution', 'wearable'],
    },
    {
      id: 'e2',
      layer: 'agent',
      content: '默认输出格式：Executive Summary + 3 条 Action Items + 数据溯源卡片',
      source: 'Persona 绑定',
      importance: 0.88,
      decayScore: 0.08,
      tokenCount: 28,
      createdAt: '2026-06-15',
      lastAccessed: '2 小时前',
      tags: ['persona', 'format'],
    },
    {
      id: 'e3',
      layer: 'long',
      content: '2025 Q4 折叠屏 campaign 复盘：拉美 ROI 1.8x，巴西渠道贡献 62%',
      source: 'Reflection 晋升',
      importance: 0.75,
      decayScore: 0.22,
      tokenCount: 56,
      createdAt: '2026-05-20',
      lastAccessed: '昨天',
      tags: ['campaign', 'roi'],
    },
    {
      id: 'e4',
      layer: 'semantic',
      content: '竞品 A 在墨西哥 618 大促降价 15%，Wearable 份额 +3.2pp',
      source: 'Semantic Index',
      importance: 0.81,
      decayScore: 0.12,
      tokenCount: 34,
      createdAt: '2026-07-01',
      lastAccessed: '今天',
      tags: ['competitor', 'pricing'],
    },
    {
      id: 'e5',
      layer: 'workspace',
      content: '3C 拉美事业部 FY26 OKR：Wearable 营收 +18%，渠道多元化指数 > 0.6',
      source: 'Workspace Context',
      importance: 0.95,
      decayScore: 0.05,
      tokenCount: 38,
      createdAt: '2026-01-10',
      lastAccessed: '今天',
      tags: ['okr', 'strategy'],
    },
  ],
  reflectionLogs: [
    { id: 'r1', timestamp: '2026-07-07 23:00', summary: 'Session → Long 晋升 3 条高 importance 记忆', promoted: 3, pruned: 12 },
    { id: 'r2', timestamp: '2026-07-06 23:00', summary: 'Decay 清理低分 Session 记忆', promoted: 0, pruned: 8 },
  ],
};

const WARROOM_SESSION_MEMORY: MemoryStore = {
  id: 'mem-warroom-session',
  name: 'warroom_session_ctx',
  description: 'WarRoom 群聊 Session 记忆 · 多 Agent 协作上下文',
  scope: 'session',
  status: 'active',
  boundChatId: 'chat-warroom',
  policies: DEFAULT_POLICIES.map((p) =>
    p.layer === 'session' ? { ...p, maxTokens: 48_000, retentionDays: 14 } : p,
  ),
  totalTokens: 12_400,
  updatedAt: '2026-07-08',
  tags: ['warroom', 'multi-agent'],
  entries: [
    {
      id: 's1',
      layer: 'conversation',
      content: '@营销Agent 分析 Wearable Q3 异动，输出归因报告',
      source: 'User @mention',
      importance: 0.85,
      decayScore: 0.35,
      tokenCount: 18,
      createdAt: '2026-07-08 14:02',
      lastAccessed: '刚刚',
      tags: ['mention'],
    },
    {
      id: 's2',
      layer: 'session',
      content: '当前讨论线程：Q3 归因 → 竞品对比 → 渠道建议',
      source: 'Session Router',
      importance: 0.78,
      decayScore: 0.28,
      tokenCount: 22,
      createdAt: '2026-07-08 13:45',
      lastAccessed: '5 分钟前',
      tags: ['thread'],
    },
  ],
  reflectionLogs: [],
};

const WORKSPACE_SHARED_MEMORY: MemoryStore = {
  id: 'mem-ws-shared',
  name: '3c_latam_shared_context',
  description: '3C 拉美 Workspace 级共享记忆 · 合规 / 品牌 / 术语表',
  scope: 'workspace',
  status: 'active',
  policies: DEFAULT_POLICIES,
  totalTokens: 86_000,
  updatedAt: '2026-07-05',
  tags: ['shared', 'compliance', 'glossary'],
  entries: [
    {
      id: 'w1',
      layer: 'workspace',
      content: '品牌对外口径：禁止直接点名竞品，使用「行业标杆」替代',
      source: 'Compliance Policy',
      importance: 0.98,
      decayScore: 0.02,
      tokenCount: 24,
      createdAt: '2026-03-01',
      lastAccessed: '今天',
      tags: ['compliance', 'brand'],
    },
    {
      id: 'w2',
      layer: 'semantic',
      content: 'LATAM = 拉美事业部，含 MX/BR/AR/CL 四国，不含 US Hispanic',
      source: 'Glossary Index',
      importance: 0.9,
      decayScore: 0.04,
      tokenCount: 20,
      createdAt: '2026-02-15',
      lastAccessed: '昨天',
      tags: ['glossary'],
    },
  ],
  reflectionLogs: [
    { id: 'wr1', timestamp: '2026-07-05 02:00', summary: 'Workspace 语义索引重建完成', promoted: 0, pruned: 0 },
  ],
};

const GLOBAL_CAMPAIGN_MEMORY: MemoryStore = {
  id: 'mem-campaign-ctx',
  name: 'campaign_ops_memory',
  description: 'Campaign Ops 长期记忆 · 投放策略与用户分群',
  scope: 'agent',
  status: 'active',
  boundAgentId: 'agent-insight',
  boundAgentName: '洞察 Agent',
  policies: DEFAULT_POLICIES,
  totalTokens: 32_100,
  updatedAt: '2026-07-07',
  tags: ['campaign', 'segmentation'],
  entries: [
    {
      id: 'g1',
      layer: 'long',
      content: '高价值用户分群 LTV Top 20%：复购周期 45 天，偏好 Push + Email 组合触达',
      source: 'CDP Sync',
      importance: 0.86,
      decayScore: 0.18,
      tokenCount: 40,
      createdAt: '2026-06-10',
      lastAccessed: '3 小时前',
      tags: ['segment', 'ltv'],
    },
  ],
  reflectionLogs: [],
};

const RD_RAG_SESSION: MemoryStore = {
  id: 'mem-rd-rag',
  name: 'rd_rag_session_memory',
  description: '研发 RAG Agent Session 记忆 · 代码上下文与检索偏好',
  scope: 'session',
  status: 'active',
  boundAgentId: 'agent-rd-rag',
  boundAgentName: '研发 RAG Agent',
  policies: DEFAULT_POLICIES.map((p) =>
    p.layer === 'session' ? { ...p, maxTokens: 64_000 } : p,
  ),
  totalTokens: 18_600,
  updatedAt: '2026-07-06',
  tags: ['rag', 'engineering'],
  entries: [
    {
      id: 'rd1',
      layer: 'session',
      content: '用户偏好：检索结果需附带文件路径 + line number，Markdown 格式输出',
      source: 'User Preference',
      importance: 0.82,
      decayScore: 0.2,
      tokenCount: 26,
      createdAt: '2026-07-06',
      lastAccessed: '5 小时前',
      tags: ['preference'],
    },
    {
      id: 'rd2',
      layer: 'semantic',
      content: 'Milvus collection: rd_codebase_v3, embedding: bge-code-v1',
      source: 'KB Binding',
      importance: 0.91,
      decayScore: 0.06,
      tokenCount: 22,
      createdAt: '2026-06-01',
      lastAccessed: '今天',
      tags: ['milvus', 'config'],
    },
  ],
  reflectionLogs: [],
};

const DEFAULT_MEMORIES = [
  MARKETING_AGENT_MEMORY,
  WARROOM_SESSION_MEMORY,
  WORKSPACE_SHARED_MEMORY,
  GLOBAL_CAMPAIGN_MEMORY,
  RD_RAG_SESSION,
];

const MEMORY_BY_WORKSPACE: Record<string, MemoryStore[]> = {
  'ws-cn-marketing': DEFAULT_MEMORIES,
  'ws-apac': DEFAULT_MEMORIES,
  'ws-3c-latam': DEFAULT_MEMORIES,
  'ws-mea': DEFAULT_MEMORIES,
  'ws-eurasia': DEFAULT_MEMORIES,
  'ws-europe': DEFAULT_MEMORIES,
};

export function getMemoryStoresByWorkspace(workspaceId: string): MemoryStore[] {
  return MEMORY_BY_WORKSPACE[workspaceId] ?? DEFAULT_MEMORIES;
}

export function findMemoryStoreById(workspaceId: string, id: string): MemoryStore | undefined {
  return getMemoryStoresByWorkspace(workspaceId).find((s) => s.id === id);
}

export function findMemoryStoreByName(workspaceId: string, name: string): MemoryStore | undefined {
  return getMemoryStoresByWorkspace(workspaceId).find((s) => s.name === name);
}

export function getMemoryStatusClass(status: MemoryStoreStatus) {
  const classes: Record<MemoryStoreStatus, string> = {
    active: 'bg-claw-50 text-zinc-700 border-zinc-200',
    archived: 'bg-black/[0.04] text-[#86868b] border-black/[0.08]',
    syncing: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return classes[status];
}

export function getScopeClass(scope: MemoryScope) {
  const classes: Record<MemoryScope, string> = {
    conversation: 'bg-black/[0.04] text-[#6e6e73] border-black/[0.08]',
    session: 'bg-claw-50 text-zinc-700 border-zinc-200',
    workspace: 'bg-claw-50/60 text-claw-600 border-zinc-200',
    agent: 'bg-claw-50 text-zinc-700 border-zinc-200',
  };
  return classes[scope];
}

export function getImportanceClass(score: number) {
  if (score >= 0.85) return 'text-emerald-600';
  if (score >= 0.6) return 'text-amber-600';
  return 'text-slate-400';
}

export function getEntriesForLayer(store: MemoryStore, layer: MemoryLayer): MemoryEntry[] {
  return store.entries.filter((e) => e.layer === layer);
}

export function getLayerPolicy(store: MemoryStore, layer: MemoryLayer): LayerPolicy | undefined {
  return store.policies.find((p) => p.layer === layer);
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
