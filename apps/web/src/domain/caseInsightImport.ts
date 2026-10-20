import type { CaseInsightDraft } from '@/api/caseInsightsApi';

export type ParsedCaseHtmlArticle = {
  draft: CaseInsightDraft;
  sourceCaseId: string | null;
  fileName: string;
};

function metaValue(document: Document, name: string): string {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? '';
}

function parseList(value: string): string[] {
  return value.split('|').map((item) => item.trim()).filter(Boolean);
}

function explicitSourceLink(document: Document): string {
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')].find((anchor) =>
    /^(?:原始来源|查看原始来源|原始链接|原文链接|查看原文|original source)$/i.test(anchor.textContent?.trim() ?? ''),
  );
  return link?.href ?? '';
}

function normalizeArticleHtml(raw: string): { html: string; document: Document } {
  const document = new DOMParser().parseFromString(raw.replace(/^\uFEFF/, ''), 'text/html');
  document.querySelectorAll('script,iframe,object,embed,form,base,applet,video,audio,source').forEach((node) => node.remove());
  document.querySelectorAll('link[rel="stylesheet"],link[rel="preload"],link[rel="modulepreload"]').forEach((node) => node.remove());
  document.querySelectorAll('meta[http-equiv]').forEach((node) => node.remove());

  for (const element of Array.from(document.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') {
        element.removeAttribute(attribute.name);
      } else if (name === 'href') {
        if (/^(?:\.\.\/)?index\.html(?:#.*)?$/i.test(value)) {
          element.setAttribute('href', '#casebook-cases');
          element.setAttribute('data-casebook-tab', 'cases');
        } else if (/^(?:\.\.\/)?topics\.html(?:#.*)?$/i.test(value)) {
          element.setAttribute('href', '#casebook-topics');
          element.setAttribute('data-casebook-tab', 'topics');
        } else if (/^https?:\/\//i.test(value)) {
          element.setAttribute('rel', 'noopener noreferrer');
        } else if (!value.startsWith('#')) {
          element.removeAttribute(attribute.name);
        }
      } else if (name === 'src') {
        if (!/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value)) element.removeAttribute(attribute.name);
      } else if (name === 'style' && /(?:url\s*\(|expression\s*\(|@import)/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  document.querySelectorAll('style').forEach((style) => {
    style.textContent = (style.textContent ?? '')
      .replace(/@import[^;]+;?/gi, '')
      .replace(/url\s*\([^)]*\)/gi, 'none');
  });
  const head = document.head ?? document.documentElement.insertBefore(document.createElement('head'), document.body);
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'";
  head.prepend(policy);
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1';
    head.append(viewport);
  }
  return { html: '<!doctype html>\n' + document.documentElement.outerHTML, document };
}

export function parseCaseHtml(raw: string, fileName: string): ParsedCaseHtmlArticle | null {
  if (!raw.trim() || raw.length > 1_000_000) return null;
  const sourceDocument = new DOMParser().parseFromString(raw.replace(/^\uFEFF/, ''), 'text/html');
  const hasNonInlineImage = [...sourceDocument.querySelectorAll('img[src]')].some((image) => !/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(image.getAttribute('src')?.trim() ?? ''));
  if (hasNonInlineImage) return null;
  const { html, document } = normalizeArticleHtml(raw);
  const title = metaValue(document, 'mss-title') || document.querySelector('h1')?.textContent?.trim() || document.title.trim() || fileName.replace(/\.html?$/i, '');
  const meta = document.querySelector('.reader-meta')?.textContent?.split(/[·|]/).map((part) => part.trim()).filter(Boolean) ?? [];
  const company = metaValue(document, 'mss-company') || meta[1] || '';
  const sourceUrl = metaValue(document, 'mss-source-url')
    || document.querySelector<HTMLAnchorElement>('.source-access a[href^="http"]')?.href
    || explicitSourceLink(document)
    || '';
  const summary = metaValue(document, 'mss-summary')
    || document.querySelector('.case-v2-lead')?.textContent?.trim()
    || document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
    || '';
  const sourceCaseId = metaValue(document, 'mss-source-id') || null;
  const domainIds = parseList(metaValue(document, 'mss-domain-ids'));
  const tags = parseList(metaValue(document, 'mss-tags'));
  if (!title || !document.body.textContent?.trim()) return null;

  return {
    sourceCaseId,
    fileName,
    draft: {
      sourceCaseId,
      title,
      summary,
      company,
      sourceUrl,
      domainIds,
      tags,
      html,
      coverImage: null,
      sortOrder: 0,
    },
  };
}

export function emptyCaseDraft(): CaseInsightDraft {
  return { sourceCaseId: null, title: '', summary: '', company: '', sourceUrl: '', domainIds: [], tags: [], html: '', coverImage: null, sortOrder: 0 };
}
