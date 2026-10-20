import { useEffect, useMemo, useState } from 'react';
import { fetchPublishedCaseInsights, type CaseInsightArticle } from '@/api/caseInsightsApi';
import { casebookTemplateUrl } from '@/domain/casebookPage';
import { prepareCaseArticleHtml } from '@/domain/caseArticleHtml';
import { CaseHtml } from './CaseHtml';

const CASEBOOK_BASE = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}casebook/`;

export function CaseInsightArticlePage() {
  const params = useMemo(() => new URLSearchParams(window.location.hash.split('?')[1] ?? ''), []);
  const workspaceId = params.get('workspaceId') ?? '';
  const id = params.get('id') ?? '';
  const [article, setArticle] = useState<CaseInsightArticle | null>(null);
  const [html, setHtml] = useState('');
  const [status, setStatus] = useState<'loading' | 'missing' | 'unavailable'>('loading');

  useEffect(() => {
    if (!workspaceId || !id) {
      setStatus('missing');
      return;
    }
    let cancelled = false;
    void fetchPublishedCaseInsights(workspaceId)
      .then(async (items) => {
        const item = items.find((entry) => entry.id === id);
        if (!item) {
          if (!cancelled) setStatus('missing');
          return;
        }
        const content = item.html?.trim() || (item.sourceCaseId
          ? await fetch(casebookTemplateUrl(`cases/${item.sourceCaseId}.html`)).then((response) => {
              if (!response.ok) throw new Error('case_html_not_found');
              return response.text();
            })
          : '');
        if (!cancelled) {
          if (!content) {
            setStatus('unavailable');
            return;
          }
          setArticle(item);
          setHtml(content);
          document.title = `${item.title} - MSS AI`;
        }
      })
      .catch(() => { if (!cancelled) setStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [id, workspaceId]);

  if (!article || !html) {
    return <main className="grid min-h-screen place-items-center bg-white px-6 text-sm text-zinc-600">
      {status === 'loading' ? '正在加载案例…' : status === 'missing' ? '案例不存在或尚未发布' : '案例正文暂时无法加载'}
    </main>;
  }

  return <main className="min-h-screen bg-white">
    <CaseHtml
      html={prepareCaseArticleHtml(html, article.sourceUrl)}
      title={article.title}
      baseHref={new URL(`${CASEBOOK_BASE}cases/`, window.location.origin).href}
      standalone
    />
  </main>;
}
