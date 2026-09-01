/**
 * 外部工具的交付形态：网页端 vs 仅客户端。
 *
 * 「立即体验」前的安全提示按形态区分风险口径：
 * - 网页端工具：风险在“把内部信息传出去”
 * - 仅客户端工具（需下载安装，无网页端使用入口）：风险在“把未授权工具装进内网”
 *
 * 工具目录由 marketplace 快照提供；交付形态是独立的安全策略元数据，
 * 运营也可在工具记录上写 deliveryForm 覆盖本表。
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

/**
 * 「立即体验」前的安全提示：数据与工具两条红线，对所有外部工具一并展示。
 * 早期按交付形态二选一，实际两类风险并存（网页端也可能诱导下载客户端），
 * 因此改为并列呈现，不再依赖形态判定。
 */
export const TOOL_EXTERNAL_WARNING_RULES: { id: string; label: string; icon: string; body: string }[] = [
  {
    id: 'data',
    label: '数据安全',
    icon: 'fa-shield-halved',
    body: '禁止将公司内部信息、涉密资料、或未经授权的数据上传至外部AI网站。',
  },
  {
    id: 'tool',
    label: '工具安全',
    icon: 'fa-download',
    body: '禁止在办公终端或内网环境下载、安装未经审批的外部工具。如有需求，须提前完成安全与合规审批。',
  },
];
