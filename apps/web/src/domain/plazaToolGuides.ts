/**
 * AI广场 · 马上能用 · 工具 How to 指引资源（演示种子）
 * type: image 一指禅图 | ppt 演示稿 | video 短视频
 */

export type PlazaGuideType = 'image' | 'ppt' | 'video';

export interface PlazaToolGuide {
  id: string;
  title: string;
  type: PlazaGuideType;
  /** 预览/打开链接；演示可用占位 */
  url: string;
  blurb?: string;
}

export const PLAZA_GUIDE_TYPE_LABEL: Record<PlazaGuideType, string> = {
  image: '一指禅',
  ppt: 'PPT',
  video: '视频',
};

/** toolId → 指引列表 */
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
      type: 'ppt',
      url: '#',
      blurb: '内部入口与常见问题',
    },
    {
      id: 'g-hw-asst-2',
      title: '30 秒演示视频',
      type: 'video',
      url: '#',
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

export function getPlazaToolGuides(toolId: string): PlazaToolGuide[] {
  return PLAZA_TOOL_GUIDES[toolId] ?? [];
}
