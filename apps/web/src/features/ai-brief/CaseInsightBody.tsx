import { useEffect, useMemo, useRef, useState } from 'react';
import { recordArticleRead, type CaseInsightArticle } from '@/api/caseInsightsApi';
import { prepareCaseArticleHtml } from '@/domain/caseArticleHtml';
import { useSessionStore } from '@/stores/sessionStore';
import { CaseHtml } from './CaseHtml';

const CASEBOOK_BASE = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}casebook/`;

/** Mounted only for published case detail; ops previews continue using CaseHtml directly. */
export function CaseInsightBody({ article, html }: { article: CaseInsightArticle; html: string }) {
  const [ready, setReady] = useState(false);
  const userId = useSessionStore(state => state.user?.id);
  const entry = useRef({ reader: '', eventId: '', started: false });
  const content = useMemo(() => prepareCaseArticleHtml(html, article.sourceUrl), [html, article.sourceUrl]);

  useEffect(() => {
    if (!ready || !userId) return;
    const reader = `${article.id}:${userId}`;
    if (entry.current.reader !== reader) entry.current = { reader, eventId: crypto.randomUUID(), started: false };
    const send = () => {
      if (document.visibilityState !== 'visible' || entry.current.started) return;
      entry.current.started = true;
      const { eventId } = entry.current;
      void (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try { await recordArticleRead(article.id, eventId); return; }
          catch { if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); }
        }
      })();
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [ready, userId, article.id]);

  return <CaseHtml html={content} title={article.title}
    baseHref={new URL(`${CASEBOOK_BASE}cases/`, window.location.origin).href}
    standalone onReady={() => setReady(true)} />;
}
