import type { CaseInsightArticle } from '@/api/caseInsightsApi';
import { getDeptLabel } from '@/domain/orgTaxonomy';

export type CasebookPage = 'cases' | 'topics' | { topicFile: string };

const TOPIC_DOMAINS: Record<string, string> = {
  'topics-gtm.html': 'gtm',
  'topics-mkt.html': 'mkt',
  'topics-ecommerce.html': 'ecommerce',
  'topics-service.html': 'service',
  'topics-channel.html': 'channel',
  'topics-retail.html': 'retail',
  'topics-hr.html': 'hr',
  'topics-quality-operations.html': 'quality',
};

const CASEBOOK_ROOT = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}casebook/`;
const templateCache = new Map<string, Promise<string>>();

function textMeta(document: Document, name: string): string {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? '';
}

function parseArticle(item: CaseInsightArticle): Document {
  return new DOMParser().parseFromString(item.html ?? '', 'text/html');
}

function sourceIdFromCard(card: Element): string | null {
  const href = card.querySelector<HTMLAnchorElement>('a.cover')?.getAttribute('href') ?? '';
  const match = href.match(/(?:^|\/)cases\/([^/?#]+)\.html(?:[?#]|$)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function createTag(document: Document, label: string, className = '') {
  const tag = document.createElement('span');
  if (className) tag.className = className;
  tag.textContent = label;
  return tag;
}

function populateCard(card: HTMLElement, item: CaseInsightArticle, preserveSourceCopy: boolean) {
  const itemDocument = parseArticle(item);
  card.dataset.caseInsightId = item.id;

  const title = card.querySelector('h2 a');
  if (title) title.textContent = item.title;
  const summary = card.querySelector<HTMLElement>('.summary');
  if (summary && item.summary) summary.textContent = item.summary;

  const cover = card.querySelector<HTMLImageElement>('.cover img');
  const importedCover = itemDocument.querySelector<HTMLImageElement>('.reader-cover img, .detail-cover img');
  const coverSrc = importedCover?.getAttribute('src') ?? '';
  if (cover && /^data:image\//i.test(coverSrc)) cover.src = coverSrc;
  if (cover) cover.alt = `${item.company || item.title} 案例封面`;

  const tags = card.querySelector<HTMLElement>('.tags');
  if (tags) {
    tags.replaceChildren();
    const [primary, ...related] = item.domainIds;
    if (primary) tags.append(createTag(card.ownerDocument, `主领域 · ${getDeptLabel(primary)}`, 'mss-primary-tag'));
    for (const domain of related) tags.append(createTag(card.ownerDocument, `关联 · ${getDeptLabel(domain)}`, 'mss-related-tag'));
    for (const tag of item.tags) tags.append(createTag(card.ownerDocument, tag));
  }

  const cardFields = [
    textMeta(itemDocument, 'mss-card-ai-use-case'),
    textMeta(itemDocument, 'mss-card-business-value'),
    textMeta(itemDocument, 'mss-card-learnings'),
  ];
  if (cardFields.some(Boolean)) {
    card.querySelectorAll<HTMLElement>('.fact p, .insight p').forEach((element, index) => {
      if (cardFields[index]) element.textContent = cardFields[index]!;
    });
  } else if (!preserveSourceCopy) {
    card.querySelectorAll<HTMLElement>('.fact p, .insight p').forEach((element) => {
      element.textContent = item.summary || '打开案例查看完整实践与借鉴分析。';
    });
  }

  const metricText = textMeta(itemDocument, 'mss-card-metrics');
  const metricLabels = card.querySelectorAll<HTMLElement>('.metrics span');
  if (metricLabels[1] && metricText) metricLabels[1].textContent = metricText;
  const readerMeta = itemDocument.querySelector('.reader-meta')?.textContent ?? '';
  const score = readerMeta.match(/借鉴价值\s*\d+/)?.[0];
  if (metricLabels[0] && score) metricLabels[0].textContent = score;

  const label = card.querySelector<HTMLElement>('.eyebrow span:first-child');
  const sourceName = readerMeta.split(/[·|]/)[0]?.trim();
  if (label && sourceName) label.textContent = sourceName;

  card.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
    anchor.href = '#mss-case';
    anchor.dataset.caseInsightId = item.id;
  });
}

function insertSearch(document: Document) {
  const nav = document.querySelector<HTMLElement>('.navline');
  const count = document.querySelector('.navline .count');
  if (!nav || !count || nav.querySelector('[data-casebook-search]')) return;
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = '搜索案例';
  input.setAttribute('aria-label', '搜索案例');
  input.dataset.casebookSearch = 'true';
  input.style.cssText = 'width:180px;max-width:28vw;padding:9px 12px;border:1px solid #dde1d9;border-radius:999px;background:#fff;color:#20251f;font:inherit;font-size:13px;outline:none';
  nav.insertBefore(input, count);
}

function replaceCaseList(document: Document, container: HTMLElement, items: CaseInsightArticle[]) {
  const sourceCards = [...container.querySelectorAll<HTMLElement>('article.case')];
  const cardsBySource = new Map<string, HTMLElement>();
  sourceCards.forEach((card) => {
    const sourceId = sourceIdFromCard(card);
    if (sourceId) cardsBySource.set(sourceId, card);
  });
  const fallback = sourceCards[0];
  const cards = items.map((item) => {
    const source = item.sourceCaseId ? cardsBySource.get(item.sourceCaseId) : undefined;
    const card = (source ?? fallback)?.cloneNode(true) as HTMLElement | undefined;
    if (!card) return null;
    populateCard(card, item, Boolean(source));
    return card;
  }).filter((card): card is HTMLElement => Boolean(card));
  if (!cards.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无已发布案例';
    container.replaceChildren(empty);
  } else {
    container.replaceChildren(...cards);
  }
}

function updateTopicCounts(document: Document, items: CaseInsightArticle[]) {
  document.querySelectorAll<HTMLElement>('.topic-grid .topic-card').forEach((card) => {
    const href = card.getAttribute('href')?.split('/').pop() ?? '';
    const domain = TOPIC_DOMAINS[href];
    if (!domain) return;
    const primary = items.filter((item) => item.domainIds[0] === domain).length;
    const related = items.filter((item) => item.domainIds.slice(1).includes(domain)).length;
    const count = card.querySelector<HTMLElement>('.topic-count');
    if (count) count.textContent = `主 ${primary} · 关联 ${related}`;
  });
}

function rewriteNavigation(document: Document, items: CaseInsightArticle[]) {
  const bySource = new Map(items.filter((item) => item.sourceCaseId).map((item) => [item.sourceCaseId!, item]));
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (anchor.dataset.caseInsightId) return;
    const href = anchor.getAttribute('href') ?? '';
    const clean = href.split(/[?#]/)[0]!.split('/').pop() ?? '';
    if (clean === 'index.html') {
      anchor.href = '#mss-casebook-cases';
      anchor.dataset.casebookTab = 'cases';
    } else if (clean === 'topics.html') {
      anchor.href = '#mss-casebook-topics';
      anchor.dataset.casebookTab = 'topics';
    } else if (TOPIC_DOMAINS[clean]) {
      anchor.href = '#mss-casebook-topic';
      anchor.dataset.casebookTopic = clean;
    } else {
      const caseMatch = href.match(/(?:^|\/)cases\/([^/?#]+)\.html(?:[?#]|$)/i);
      if (!caseMatch?.[1]) return;
      const article = bySource.get(decodeURIComponent(caseMatch[1]));
      if (article) {
        anchor.href = '#mss-case';
        anchor.dataset.caseInsightId = article.id;
      } else {
        anchor.removeAttribute('href');
        anchor.setAttribute('aria-disabled', 'true');
      }
    }
  });
}

export function renderCasebookPage(template: string, items: CaseInsightArticle[], page: CasebookPage): string {
  const document = new DOMParser().parseFromString(template, 'text/html');
  const base = document.createElement('base');
  base.href = new URL(CASEBOOK_ROOT, window.location.origin).href;
  document.head.prepend(base);

  if (page === 'cases') {
    const list = document.querySelector<HTMLElement>('main.grid');
    if (list) replaceCaseList(document, list, items);
    const count = document.querySelector<HTMLElement>('.navline .count');
    if (count) count.textContent = `${items.length} CASES`;
    insertSearch(document);
  } else if (page === 'topics') {
    updateTopicCounts(document, items);
  } else {
    const domain = TOPIC_DOMAINS[page.topicFile];
    const related = domain ? items.filter((item) => item.domainIds.includes(domain)) : [];
    const list = document.querySelector<HTMLElement>('main.topic-layout .topic-cases');
    if (list) replaceCaseList(document, list, related);
    const count = document.querySelector<HTMLElement>('.navline .count');
    if (count) count.textContent = `${related.length} CASES`;
    const names = document.querySelector<HTMLElement>('.topic-meta-case');
    if (names) names.textContent = related.length ? `代表案例：${related.map((item) => item.company || item.title).join('、')}` : '暂无已发布案例';
  }

  rewriteNavigation(document, items);
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}

export function casebookTemplateUrl(file: string): string {
  return `${CASEBOOK_ROOT}${file.split('/').map(encodeURIComponent).join('/')}`;
}

export function loadCasebookTemplate(file: string): Promise<string> {
  const cached = templateCache.get(file);
  if (cached) return cached;
  const request = fetch(casebookTemplateUrl(file)).then((response) => {
    if (!response.ok) throw new Error(`casebook_template_${response.status}`);
    return response.text();
  }).catch((error: unknown) => {
    templateCache.delete(file);
    throw error;
  });
  templateCache.set(file, request);
  return request;
}

export function topicDomain(file: string): string | null {
  return TOPIC_DOMAINS[file] ?? null;
}
