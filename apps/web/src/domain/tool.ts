import { z } from 'zod';

export const ToolTypeSchema = z.enum(['http', 'mcp', 'openapi', 'python', 'node', 'function']);
export type ToolType = z.infer<typeof ToolTypeSchema>;

export const ToolStatusSchema = z.enum(['draft', 'testing', 'active', 'deprecated']);
export type ToolStatus = z.infer<typeof ToolStatusSchema>;

export const CredentialTypeSchema = z.enum(['none', 'api_key', 'oauth2', 'sso', 'secret_ref']);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

export const PlatformToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  type: ToolTypeSchema,
  status: ToolStatusSchema,
  version: z.string(),
  endpoint: z.string(),
  method: z.string().optional(),
  credentialType: CredentialTypeSchema,
  credentialLabel: z.string(),
  rateLimit: z.string(),
  timeoutMs: z.number(),
  usedBySkills: z.array(z.string()),
  usedByAgents: z.array(z.string()),
  tags: z.array(z.string()),
  updatedAt: z.string(),
  author: z.string(),
});
export type PlatformTool = z.infer<typeof PlatformToolSchema>;

export const TOOL_TYPE_META: Record<ToolType, { icon: string; color: string; label: string }> = {
  http: { icon: 'fa-globe', color: 'blue', label: 'HTTP' },
  mcp: { icon: 'fa-plug', color: 'violet', label: 'MCP' },
  openapi: { icon: 'fa-file-code', color: 'orange', label: 'OpenAPI' },
  python: { icon: 'fa-python', color: 'amber', label: 'Python' },
  node: { icon: 'fa-node-js', color: 'green', label: 'Node' },
  function: { icon: 'fa-code', color: 'slate', label: 'Function' },
};

export const TOOL_CATALOG: Record<string, PlatformTool[]> = {
  'ws-3c-latam': [
    {
      id: 'tool-sap',
      name: 'SAP_S4HANA_OData',
      displayName: 'SAP S/4HANA OData',
      description: 'ERP 销售与财务数据 OData 接口，支持 SSO 企业凭证。',
      type: 'http',
      status: 'active',
      version: 'v2.3',
      endpoint: 'https://sap.internal.company/odata/v4/sales',
      method: 'GET',
      credentialType: 'sso',
      credentialLabel: 'Enterprise SSO (Okta)',
      rateLimit: '120 req/min',
      timeoutMs: 15000,
      usedBySkills: ['SQL_Generator'],
      usedByAgents: ['营销 Agent'],
      tags: ['erp', 'sap', 'odata'],
      updatedAt: '2026-06-28',
      author: 'Bruce',
    },
    {
      id: 'tool-salesforce',
      name: 'Salesforce_REST_v5',
      displayName: 'Salesforce REST API',
      description: 'CRM Campaign 与 ROI 数据拉取。',
      type: 'http',
      status: 'active',
      version: 'v5.1',
      endpoint: 'https://company.my.salesforce.com/services/data/v59.0',
      method: 'GET',
      credentialType: 'oauth2',
      credentialLabel: 'OAuth2 Client Credentials',
      rateLimit: '60 req/min',
      timeoutMs: 10000,
      usedBySkills: ['SQL_Generator'],
      usedByAgents: ['营销 Agent'],
      tags: ['crm', 'salesforce'],
      updatedAt: '2026-07-01',
      author: 'Mcyo',
    },
    {
      id: 'tool-milvus',
      name: 'Milvus_gRPC',
      displayName: 'Milvus Vector DB',
      description: 'gRPC 向量检索，collection 级 RBAC 隔离。',
      type: 'mcp',
      status: 'active',
      version: 'v1.8',
      endpoint: 'milvus.internal:19530',
      credentialType: 'api_key',
      credentialLabel: 'Milvus API Key (scoped)',
      rateLimit: '500 req/min',
      timeoutMs: 8000,
      usedBySkills: ['Vector_Search', 'Knowledge_Synthesizer'],
      usedByAgents: ['知识 Agent'],
      tags: ['milvus', 'vector', 'mcp'],
      updatedAt: '2026-06-15',
      author: 'Mcyo',
    },
    {
      id: 'tool-python-sandbox',
      name: 'Python_Sandbox',
      displayName: 'Python Sandbox',
      description: '隔离容器执行 SHAP / Pandas 分析脚本。',
      type: 'function',
      status: 'active',
      version: 'v1.2',
      endpoint: 'sandbox://python/exec',
      credentialType: 'secret_ref',
      credentialLabel: 'Vault: sandbox/runtime-token',
      rateLimit: '10 concurrent',
      timeoutMs: 30000,
      usedBySkills: ['SHAPAnalyzer'],
      usedByAgents: ['营销 Agent'],
      tags: ['sandbox', 'python', 'ml'],
      updatedAt: '2026-07-05',
      author: 'Mcyo',
    },
    {
      id: 'tool-shield-llm',
      name: 'Shield-70B-Chat',
      displayName: 'Shield LLM Gateway',
      description: '企业合规大模型网关，内容安全过滤。',
      type: 'http',
      status: 'active',
      version: 'v3.0',
      endpoint: 'https://llm-gateway.internal/v1/chat/completions',
      method: 'POST',
      credentialType: 'api_key',
      credentialLabel: 'Shield API Key (L3)',
      rateLimit: '30 req/min',
      timeoutMs: 120000,
      usedBySkills: ['Knowledge_Synthesizer'],
      usedByAgents: ['知识 Agent', '营销 Agent'],
      tags: ['llm', 'gateway', 'compliance'],
      updatedAt: '2026-06-01',
      author: 'Platform',
    },
  ],
  'ws-global-marketing': [
    {
      id: 'tool-ga4',
      name: 'GA4_Reporting_API',
      displayName: 'Google Analytics 4',
      description: 'Campaign 转化与漏斗 Reporting API。',
      type: 'openapi',
      status: 'active',
      version: 'v1.0',
      endpoint: 'https://analyticsdata.googleapis.com/v1beta',
      method: 'POST',
      credentialType: 'oauth2',
      credentialLabel: 'Google Service Account',
      rateLimit: '100 req/min',
      timeoutMs: 12000,
      usedBySkills: ['ROI_Compare'],
      usedByAgents: ['洞察 Agent'],
      tags: ['ga4', 'analytics', 'openapi'],
      updatedAt: '2026-06-10',
      author: 'Sarah',
    },
  ],
  'ws-rd-knowledge': [
    {
      id: 'tool-milvus-rd',
      name: 'Milvus_gRPC',
      displayName: 'Milvus RD Cluster',
      description: '研发知识库专用 Milvus 集群。',
      type: 'mcp',
      status: 'testing',
      version: 'v1.0',
      endpoint: 'milvus-rd.internal:19530',
      credentialType: 'api_key',
      credentialLabel: 'RD Milvus Key',
      rateLimit: '200 req/min',
      timeoutMs: 8000,
      usedBySkills: ['Spec_Search'],
      usedByAgents: ['研发 RAG Agent'],
      tags: ['milvus', 'rd'],
      updatedAt: '2026-05-30',
      author: 'RD-Team',
    },
  ],
};

export function getToolsByWorkspace(workspaceId: string): PlatformTool[] {
  return TOOL_CATALOG[workspaceId] ?? [];
}

export function findToolById(workspaceId: string, id: string): PlatformTool | undefined {
  return getToolsByWorkspace(workspaceId).find((t) => t.id === id);
}

export function findToolByName(workspaceId: string, name: string): PlatformTool | undefined {
  return getToolsByWorkspace(workspaceId).find((t) => t.name === name || t.displayName === name);
}

export function getToolStatusClass(status: ToolStatus) {
  const classes: Record<ToolStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    testing: 'bg-blue-50 text-blue-600 border-blue-200',
    active: 'bg-green-50 text-green-600 border-green-200',
    deprecated: 'bg-amber-50 text-amber-600 border-amber-200',
  };
  return classes[status];
}

export function getCredentialTypeLabel(type: CredentialType) {
  const labels: Record<CredentialType, string> = {
    none: 'None',
    api_key: 'API Key',
    oauth2: 'OAuth 2.0',
    sso: 'SSO',
    secret_ref: 'Secret Vault',
  };
  return labels[type];
}
