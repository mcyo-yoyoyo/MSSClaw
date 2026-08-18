/**
 * 外部工具的交付形态：网页端 vs 仅客户端。
 *
 * 「立即体验」前的安全提示按形态区分风险口径：
 * - 网页端工具：风险在“把内部信息传出去”
 * - 仅客户端工具（需下载安装，无网页端使用入口）：风险在“把未授权工具装进内网”
 *
 * EXTERNAL_TOOLS_CATALOG 由 CSV 自动生成、不可手改，所以形态在这里单独维护。
 * 运营也可在工具种子上写 deliveryForm 覆盖本表。
 */

export type ToolDeliveryForm = 'web' | 'download_only';

/**
 * 仅客户端形态：官方没有可直接使用的网页端，必须下载安装
 * （桌面应用 / IDE / 编辑器 / 插件 / 命令行）。
 *
 * 依据为各条目的 version 形态字段；WorkBuddy 的 version 虽写「桌面端 / Web」，
 * 但其站点为产品介绍页而非网页版使用入口，按业务口径归入本表。
 */
export const DOWNLOAD_ONLY_TOOL_IDS: ReadonlySet<string> = new Set([
  'tool-saas-workbuddy',    // 桌面端执行型助手，官网为介绍页
  'tool-ext-granola',       // App（桌面端会议记录）
  'tool-ext-obsidian',      // Desktop / Mobile
  'tool-saas-windsurf',     // Editor（下载安装的编辑器）
  'tool-saas-trae',         // TRAE IDE / SOLO
  'tool-ext--codebuddy',    // CodeBuddy IDE / CLI
  'tool-ext-t03d8f35876',   // 通义灵码：IDE 插件 / Agent
  'tool-ext-codegeex',      // Plugin / Model
  'tool-ext-fitten-code',   // IDE Plugin
]);

export function resolveToolDeliveryForm(tool: {
  id: string;
  deliveryForm?: ToolDeliveryForm;
}): ToolDeliveryForm {
  if (tool.deliveryForm) return tool.deliveryForm;
  return DOWNLOAD_ONLY_TOOL_IDS.has(tool.id) ? 'download_only' : 'web';
}

export function isDownloadOnlyTool(tool: { id: string; deliveryForm?: ToolDeliveryForm }): boolean {
  return resolveToolDeliveryForm(tool) === 'download_only';
}

/** 「立即体验」安全提示文案 */
export const TOOL_EXTERNAL_WARNING_COPY: Record<
  ToolDeliveryForm,
  { title: string; body: string }
> = {
  web: {
    title: '禁止将公司内部信息上传到外部AI网站',
    body: '请确认即将处理的内容不包含公司内部、涉密、个人隐私或未经授权的数据。',
  },
  download_only: {
    title: '禁止在公司内部下载未授权工具到内网使用',
    body: '该工具需下载客户端后使用，没有可直接使用的网页端。请勿在办公终端或内网环境安装未经审批的外部工具；确有需要请先完成安全与合规审批。',
  },
};
