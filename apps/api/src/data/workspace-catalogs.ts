/** Workspace catalog seed — mirrors apps/web/src/domain/workspace.ts */
export interface WorkspaceCatalogSeed {
  workspace: {
    id: string;
    name: string;
    namespace: string;
    description: string;
    memberCount: number;
  };
  defaultChatId: string;
  chats: Record<string, unknown>;
  resources: unknown[];
}

const LATAM_CHATS = {
  marketing: {
    id: 'marketing',
    title: '营销 Agent',
    type: 'bot',
    icon: 'fa-chart-pie',
    color: 'indigo',
    status: '已接入 PSI、GFK & ISRP等多系统数据',
    history: [
      {
        role: 'agent',
        name: '营销 Agent',
        text: '您好！我是 3C 消费电子专享的营销分析 Agent。基于全球销售中台数据，我可以为您执行深度的异动归因与预测推演。请点击底部指令或直接输入需求。',
      },
    ],
    prompts: [
      '近一周欧洲穿戴产品销售趋势分析',
      '3月各代表处DOS分析',
      '各代表处25年累计SO总量排名，剔除IoT',
    ],
  },
  knowledge: {
    id: 'knowledge',
    title: '知识 Agent',
    type: 'bot',
    icon: 'fa-book-open',
    color: 'emerald',
    status: '已挂载 1.2TB 企业产品+业务向量库',
    history: [
      {
        role: 'agent',
        name: '知识 Agent',
        text: '您好！我是企业 RAG 知识助手。已加载产品白皮书、合规标准（如 RoHS/CE）及各部门会议纪要。支持带引用的文献溯源问答。',
      },
    ],
    prompts: ['总结 2025 年度可穿戴设备产品线 OKR 完成进度及卡点'],
  },
};

export const WORKSPACE_CATALOGS: WorkspaceCatalogSeed[] = [
  {
    workspace: {
      id: 'ws-3c-latam',
      name: '3C 拉美事业部',
      namespace: '3c.latam',
      description: '拉美穿戴与智能终端业务作战空间',
      memberCount: 28,
    },
    defaultChatId: 'marketing',
    chats: LATAM_CHATS,
    resources: [
      { id: 'agent-marketing', kind: 'agent', name: '营销 Agent', status: 'online', icon: 'fa-chart-pie', chatId: 'marketing' },
      { id: 'agent-knowledge', kind: 'agent', name: '知识 Agent', status: 'online', icon: 'fa-book-open', chatId: 'knowledge' },
      { id: 'wf-q3-attribution', kind: 'workflow', name: 'Q3 归因分析流', status: 'draft', icon: 'fa-diagram-project' },
      { id: 'kb-enterprise', kind: 'knowledge', name: '3c_enterprise_knowledge_v2', status: 'online', icon: 'fa-database' },
      { id: 'prompt-qa-strict', kind: 'prompt', name: 'ENTERPRISE_QA_STRICT', status: 'released', icon: 'fa-file-lines', version: 'v3' },
    ],
  },
  {
    workspace: {
      id: 'ws-global-marketing',
      name: '全球营销中台',
      namespace: 'global.marketing',
      description: '跨区域 Campaign 与渠道策略协同',
      memberCount: 56,
    },
    defaultChatId: 'insight_agent',
    chats: {
      campaign_ops: {
        id: 'campaign_ops',
        title: '全球 Campaign Ops',
        type: 'group',
        icon: 'fa-bullhorn',
        color: 'violet',
        status: '12 位成员 · 多区域协同',
        history: [{ role: 'system', text: '您进入了全球营销中台工作区' }],
        prompts: ['@营销 Agent 汇总亚太区近 30 天 Campaign ROI'],
      },
      insight_agent: {
        id: 'insight_agent',
        title: '洞察 Agent',
        type: 'bot',
        icon: 'fa-lightbulb',
        color: 'amber',
        status: '已接入全球媒介与转化漏斗',
        history: [{ role: 'agent', name: '洞察 Agent', text: '您好！我可以帮您做跨区 Campaign 效果对比。' }],
        prompts: ['对比 NA / EMEA / APAC 近 4 周 CTR 趋势'],
      },
    },
    resources: [
      { id: 'agent-insight', kind: 'agent', name: '洞察 Agent', status: 'online', icon: 'fa-lightbulb', chatId: 'insight_agent' },
      { id: 'wf-budget-sim', kind: 'workflow', name: '预算模拟流', status: 'testing', icon: 'fa-diagram-project' },
      { id: 'kb-campaign-playbook', kind: 'knowledge', name: 'global_campaign_playbook', status: 'online', icon: 'fa-database' },
      { id: 'prompt-campaign-brief', kind: 'prompt', name: 'CAMPAIGN_BRIEF_GENERATOR', status: 'released', icon: 'fa-file-lines', version: 'v2' },
    ],
  },
  {
    workspace: {
      id: 'ws-rd-knowledge',
      name: '研发知识库',
      namespace: 'rd.knowledge',
      description: '产品规格、SOP、合规与研发文档中心',
      memberCount: 112,
    },
    defaultChatId: 'rd_rag',
    chats: {
      rd_rag: {
        id: 'rd_rag',
        title: '研发 RAG Agent',
        type: 'bot',
        icon: 'fa-flask',
        color: 'cyan',
        status: '已挂载规格书 / SOP / 合规库',
        history: [{ role: 'agent', name: '研发 RAG Agent', text: '您好！我可以检索产品规格与研发 SOP。' }],
        prompts: ['查询旗舰机影像模组规格差异'],
      },
    },
    resources: [
      { id: 'agent-rd-rag', kind: 'agent', name: '研发 RAG Agent', status: 'online', icon: 'fa-flask', chatId: 'rd_rag' },
      { id: 'kb-rd-spec', kind: 'knowledge', name: 'rd_spec_library', status: 'online', icon: 'fa-database' },
      { id: 'prompt-spec-compare', kind: 'prompt', name: 'SPEC_COMPARE_STRICT', status: 'approved', icon: 'fa-file-lines', version: 'v1' },
    ],
  },
];

export function buildCatalogPayload(catalog: WorkspaceCatalogSeed) {
  return {
    workspace: catalog.workspace,
    chats: catalog.chats,
    resources: catalog.resources,
    defaultChatId: catalog.defaultChatId,
  };
}
