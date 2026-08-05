/** 公司工具推荐默认华为 Logo（取自华为官网 favicon-logo.svg，适配 GitHub Pages base） */
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
  logoUrl?: string | null;
  homepageUrl?: string | null;
  sourceType?: string | null;
  tags?: string[] | null;
  marketShelf?: 'external' | 'internal' | 'none' | null;
  published?: boolean | null;
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

  const home = tool.homepageUrl?.trim();
  if (!home || home === '#') return undefined;
  try {
    return faviconUrl(new URL(home).hostname);
  } catch {
    return undefined;
  }
}
