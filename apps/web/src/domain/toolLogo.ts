/** 内部办公推荐默认华为 Logo（取自华为官网 favicon-logo.svg，适配 GitHub Pages base） */
export function companyToolLogoUrl(): string {
  const base = String(import.meta.env.BASE_URL || '/');
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}brand/huawei-logo.svg`;
}

export function internalToolAssetUrl(filename: string): string {
  const base = String(import.meta.env.BASE_URL || '/');
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}brand/internal-tools/${filename}`;
}

/** 从官网 URL 推导 favicon（外精选初始化用） */
export function faviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

type LogoToolInput = {
  id?: string | null;
  logoUrl?: string | null;
  homepageUrl?: string | null;
  sourceType?: string | null;
  tags?: string[] | null;
  marketShelf?: 'external' | 'internal' | 'none' | null;
  published?: boolean | null;
};

/** 没有独立品牌素材的工具，可复用同品牌产品的官网 favicon。 */
const EXTERNAL_TOOL_LOGO_HOMEPAGE_ALIASES: Record<string, string> = {
  'tool-ext-t13eee22e20': 'https://tongyi.aliyun.com/lingma/',
};

/** 产品名称与品牌库名称不一致时，映射到对应的品牌图标。 */
const EXTERNAL_TOOL_LOGO_URL_ALIASES: Record<string, string> = {
  'tool-excel-trae-work':
    'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/trae-color.svg',
};

function isCompanyShelfTool(tool: LogoToolInput): boolean {
  if (tool.marketShelf === 'internal') return true;
  if (tool.marketShelf === 'external' || tool.marketShelf === 'none') return false;
  const tags = tool.tags ?? [];
  if (tags.includes('hw-internal')) return true;
  return tool.sourceType === 'internal' && tags.includes('hw-internal');
}

/** 公司推荐：自定义 Logo 优先，否则统一华为 Logo；外精选 → 上传优先，否则官网 favicon */
export function resolveToolLogoUrl(tool: LogoToolInput): string | undefined {
  const custom = tool.logoUrl?.trim();
  if (custom) return custom;

  if (isCompanyShelfTool(tool)) {
    return companyToolLogoUrl();
  }

  const aliasedLogo = tool.id ? EXTERNAL_TOOL_LOGO_URL_ALIASES[tool.id] : undefined;
  if (aliasedLogo) return aliasedLogo;

  const home =
    (tool.id ? EXTERNAL_TOOL_LOGO_HOMEPAGE_ALIASES[tool.id] : undefined) ??
    tool.homepageUrl?.trim();
  if (!home || home === '#') return undefined;
  try {
    return faviconUrl(new URL(home).hostname);
  } catch {
    return undefined;
  }
}
