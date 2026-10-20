import { useEffect, useState } from 'react';
import { fetchPublishedCaseInsights, type CaseInsightArticle } from '@/api/caseInsightsApi';
import { casebookTemplateUrl } from '@/domain/casebookPage';

export type CaseArticleState =
  | { status: 'loading' }
  /** 不存在、未发布或已删除：详情页统一显示「已下架」 */
  | { status: 'missing' }
  | { status: 'unavailable' }
  | { status: 'ready'; article: CaseInsightArticle; html: string };

/** 读取已发布的案例洞察：正文优先用文章自带 HTML，没有时取随包的案例模板页 */
export function useCaseInsightArticle(id: string | undefined): CaseArticleState {
  const [state, setState] = useState<CaseArticleState>({ status: 'loading' });

  useEffect(() => {
    if (!id) {
      setState({ status: 'missing' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    void fetchPublishedCaseInsights()
      .then(async (items) => {
        const article = items.find((entry) => entry.id === id);
        if (!article) {
          if (!cancelled) setState({ status: 'missing' });
          return;
        }
        const html = article.html?.trim() || (article.sourceCaseId
          ? await fetch(casebookTemplateUrl(`cases/${article.sourceCaseId}.html`)).then((response) => {
              if (!response.ok) throw new Error('case_html_not_found');
              return response.text();
            })
          : '');
        if (!cancelled) setState(html ? { status: 'ready', article, html } : { status: 'unavailable' });
      })
      .catch(() => { if (!cancelled) setState({ status: 'unavailable' }); });
    return () => { cancelled = true; };
  }, [id]);

  return state;
}
