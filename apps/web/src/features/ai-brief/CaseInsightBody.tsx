import { useMemo } from 'react';
import type { CaseInsightArticle } from '@/api/caseInsightsApi';
import { prepareCaseArticleHtml } from '@/domain/caseArticleHtml';
import { CaseHtml } from './CaseHtml';

const CASEBOOK_BASE = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}casebook/`;

/** Detail events are owned by AssetDetailPage, shared with all other asset types. */
export function CaseInsightBody({ article, html }: { article: CaseInsightArticle; html: string }) {
  const content = useMemo(() => prepareCaseArticleHtml(html, article.sourceUrl), [html, article.sourceUrl]);

  return <CaseHtml html={content} title={article.title}
    baseHref={new URL(`${CASEBOOK_BASE}cases/`, window.location.origin).href}
    standalone />;
}
