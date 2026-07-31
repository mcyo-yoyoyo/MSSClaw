/**
 * 找案例 · 常用 AI 工具 · How to 指引
 * 支持：图片 · PDF · PPT · 视频 · 外链 · 文字说明
 * 运营可在「门户运营 · 工具 How to」维护。
 */

export type PlazaGuideType = 'image' | 'pdf' | 'ppt' | 'video' | 'link' | 'text';

export interface PlazaToolGuide {
  id: string;
  title: string;
  type: PlazaGuideType;
  /**
   * 资源地址：外链 URL，或本地上传后的 data URL。
   * `#` 表示占位未配置。
   */
  url: string;
  /** 上传文件名（有上传时展示；外链可空） */
  fileName?: string;
  /** 一句话摘要（列表展示） */
  blurb?: string;
  /** 正文（type=text 时必填；其他类型可选补充说明） */
  body?: string;
}

/** 带工具归属的运营记录 */
export interface PlazaToolGuideRecord extends PlazaToolGuide {
  toolId: string;
}

export const PLAZA_GUIDE_TYPE_LABEL: Record<PlazaGuideType, string> = {
  image: '图片',
  pdf: 'PDF',
  ppt: 'PPT',
  video: '视频',
  link: '链接',
  text: '文字',
};

export const PLAZA_GUIDE_TYPE_HINT: Record<PlazaGuideType, string> = {
  image: '可上传图片，或填图片 URL；用户侧可预览',
  pdf: '可上传 PDF（≤3MB），或填在线预览 / 下载链接',
  ppt: '可上传 PPT（≤3MB），或填网盘 / 在线演示链接',
  video: '短视频可上传（≤3MB）；较长请用点播页 / 外链',
  link: '任意网页、文档站、知识库外链（本类型仅填 URL）',
  text: '撰写操作步骤；可选上传附件或填下载链接',
};

export const PLAZA_GUIDE_TYPE_OPTIONS: PlazaGuideType[] = [
  'image',
  'pdf',
  'ppt',
  'video',
  'link',
  'text',
];

const GUIDE_TYPE_SET = new Set<string>(PLAZA_GUIDE_TYPE_OPTIONS);

/** 兼容历史种子 / 运营脏数据 */
export function normalizePlazaGuideType(raw: unknown): PlazaGuideType {
  if (typeof raw === 'string' && GUIDE_TYPE_SET.has(raw)) return raw as PlazaGuideType;
  // 旧「一指禅」语义并入图片
  if (raw === 'howto' || raw === 'guide') return 'link';
  return 'link';
}

export function normalizePlazaToolGuideRecord(
  raw: Partial<PlazaToolGuideRecord> & { id?: string; toolId?: string; title?: string },
): PlazaToolGuideRecord | null {
  if (!raw?.id || !raw.toolId || !raw.title) return null;
  return {
    id: String(raw.id),
    toolId: String(raw.toolId),
    title: String(raw.title),
    type: normalizePlazaGuideType(raw.type),
    url: typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : '#',
    fileName:
      typeof raw.fileName === 'string' && raw.fileName.trim()
        ? raw.fileName.trim()
        : undefined,
    blurb: typeof raw.blurb === 'string' && raw.blurb.trim() ? raw.blurb.trim() : undefined,
    body: typeof raw.body === 'string' && raw.body.trim() ? raw.body.trim() : undefined,
  };
}

/** 该类型是否需要资源（外链或上传文件） */
export function guideNeedsUrl(type: PlazaGuideType): boolean {
  return type !== 'text';
}

export function hasHowtoResource(guide: Pick<PlazaToolGuide, 'url'>): boolean {
  return Boolean(guide.url && guide.url !== '#');
}

/** toolId → 指引列表（种子） */
export const PLAZA_TOOL_GUIDES: Record<string, PlazaToolGuide[]> = {
  'tool-saas-chatgpt': [
    {
      id: 'g-chatgpt-1',
      title: 'ChatGPT 营销服 3 分钟上手',
      type: 'image',
      url: '#',
      blurb: '账号申请 → 常用 Prompt → 交付物导出',
    },
    {
      id: 'g-chatgpt-2',
      title: '竞品价盘提问模板',
      type: 'ppt',
      url: '#',
      blurb: '可复制的周报提问结构',
    },
    {
      id: 'g-chatgpt-3',
      title: '安全使用须知（文字）',
      type: 'text',
      url: '#',
      blurb: '脱敏与外发红线',
      body: '1. 勿粘贴客户 PII / 未公开报价\n2. 生成内容须人工复核后再外发\n3. 涉及合规问题请转知识 Agent',
    },
  ],
  'tool-saas-doubao': [
    {
      id: 'g-doubao-1',
      title: '豆包中文办公一指禅',
      type: 'image',
      url: '#',
    },
  ],
  'tool-hw-assistant': [
    {
      id: 'g-hw-asst-1',
      title: '员工助手进厅与权限说明',
      type: 'pdf',
      url: '#',
      blurb: '内部入口与常见问题',
    },
    {
      id: 'g-hw-asst-2',
      title: '30 秒演示视频',
      type: 'video',
      url: '#',
    },
    {
      id: 'g-hw-asst-3',
      title: '服务台知识库入口',
      type: 'link',
      url: '#',
      blurb: 'FAQ 与工单自助',
    },
  ],
  'tool-hw-xiaowei': [
    {
      id: 'g-xiaowei-1',
      title: '小微助手场景速查',
      type: 'image',
      url: '#',
    },
  ],
  'tool-saas-perplexity': [
    {
      id: 'g-pplx-1',
      title: '带引用检索怎么用',
      type: 'video',
      url: '#',
    },
  ],
  'tool-saas-cursor': [
    {
      id: 'g-cursor-1',
      title: 'Cursor 内部工程约定',
      type: 'ppt',
      url: '#',
    },
  ],
  'tool-hw-meeting': [
    {
      id: 'g-meeting-1',
      title: '会议 AI 听一指禅',
      type: 'image',
      url: '#',
    },
  ],
};

export function flattenPlazaToolGuideSeeds(): PlazaToolGuideRecord[] {
  const out: PlazaToolGuideRecord[] = [];
  for (const [toolId, list] of Object.entries(PLAZA_TOOL_GUIDES)) {
    for (const g of list) {
      out.push({ ...g, toolId });
    }
  }
  return out;
}

/** @deprecated 请用 store.guidesFor；保留给非 React 兜底 */
export function getPlazaToolGuides(toolId: string): PlazaToolGuide[] {
  return PLAZA_TOOL_GUIDES[toolId] ?? [];
}
