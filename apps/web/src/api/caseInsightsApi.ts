import { apiAuthHeaders, apiUrl, fetchWithTimeout } from '@/api/client';

export interface CaseInsightArticle {
  id: string;
  sourceCaseId?: string | null;
  title: string;
  summary: string;
  company: string;
  sourceUrl: string;
  domainIds: string[];
  tags: string[];
  html?: string | null;
  coverImage?: string | null;
  legacyMarkdown?: string | null;
  publishedAt: string | null;
  status?: 'draft' | 'published' | 'archived';
  deletedAt?: string | null;
  deletedFromStatus?: string | null;
  sortOrder?: number;
  version?: number;
  publishedVersion?: number | null;
  updatedAt?: string;
}

export type CaseInsightDraft = Omit<Pick<CaseInsightArticle, 'title' | 'summary' | 'company' | 'sourceUrl' | 'domainIds' | 'tags'>, 'html'> & {
  sourceCaseId?: string | null;
  html: string;
  coverImage: string | null;
  sortOrder: number;
  version?: number;
};

function route(suffix = '') {
  return apiUrl(`/api/v1/case-insights${suffix}`);
}

async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetchWithTimeout(url, {
    method,
    headers: { Accept: 'application/json', ...apiAuthHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  }, 20_000);
  if (!response.ok) throw new Error(`case_insights_${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchPublishedCaseInsights() {
  return (await request<{ items: CaseInsightArticle[] }>(route())).items;
}

export async function fetchCaseInsightsForOps(view: 'active' | 'trash' = 'active') {
  const suffix = view === 'trash' ? '/ops?view=trash' : '/ops';
  return (await request<{ items: CaseInsightArticle[] }>(route(suffix))).items;
}

export async function createCaseInsight(draft: CaseInsightDraft) {
  return request<{ id: string; version: number }>(route(), 'POST', draft);
}

export async function updateCaseInsight(id: string, draft: CaseInsightDraft) {
  return request<{ id: string; version: number }>(route(`/${encodeURIComponent(id)}`), 'PUT', draft);
}

export async function changeCaseInsightStatus(id: string, version: number, action: 'publish' | 'unpublish') {
  return request<{ id: string; version: number }>(route(`/${encodeURIComponent(id)}/${action}`), 'POST', { version });
}

export async function deleteCaseInsight(id: string, version: number) {
  return request<{ id: string; version: number; deleted: boolean }>(route(`/${encodeURIComponent(id)}`), 'DELETE', { version });
}

export async function restoreCaseInsight(id: string, version: number) {
  return request<{ id: string; version: number; status: string }>(route(`/${encodeURIComponent(id)}/restore`), 'POST', { version });
}

export type ArticleReadPoint = { date: string; pv: number; uv: number };
export type ArticleReadRow = { id: string; pv: number; uv: number; lifetime: { pv: number; uv: number }; series: ArticleReadPoint[] };
export type ArticleReadReport = {
  from: string; to: string; timezone: 'Asia/Shanghai'; source: 'platform-case-views'; updatedAt: string; trackingStartedAt: string | null;
  totals: { pv: number; uv: number; articles: number }; series: ArticleReadPoint[]; items: ArticleReadRow[];
};
export function fetchArticleReadReport(from: string, to: string) {
  return request<ArticleReadReport>(route('/reads?' + new URLSearchParams({ from, to })));
}
export function recordArticleRead(id: string, eventId: string) {
  // Legacy compatibility only; normal detail pages use the shared market-engagement endpoint.
  return request(route(`/${encodeURIComponent(id)}/read`), 'POST', { eventId });
}
