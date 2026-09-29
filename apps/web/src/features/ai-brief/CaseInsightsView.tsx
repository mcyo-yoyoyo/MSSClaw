import { useEffect, useMemo, useState } from 'react';
import { fetchPublishedCaseInsights, type CaseInsightArticle } from '@/api/caseInsightsApi';
import { getDeptLabel } from '@/domain/orgTaxonomy';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const ARTICLE_URL = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}#/case-insight`;

function articleUrl(workspaceId: string, id: string) {
  return `${ARTICLE_URL}?workspaceId=${encodeURIComponent(workspaceId)}&id=${encodeURIComponent(id)}`;
}

type CasePresentation = {
  cover: string | null;
  practice: string;
  businessValue: string;
};

function getMeta(document: Document, name: string) {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? '';
}

function getPresentation(item: CaseInsightArticle): CasePresentation {
  const document = new DOMParser().parseFromString(item.html ?? '', 'text/html');
  const cover = document.querySelector<HTMLImageElement>('.reader-cover img, .detail-cover img')?.getAttribute('src') ?? '';
  return {
    cover: item.coverImage || (/^data:image\//i.test(cover) ? cover : null),
    practice: getMeta(document, 'mss-card-ai-use-case'),
    businessValue: getMeta(document, 'mss-card-business-value'),
  };
}

function publishedDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function CaseInsightsView() {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const domain = useMarketFilterStore((state) => state.orgSelection.dept[0] ?? null);
  const [items, setItems] = useState<CaseInsightArticle[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchPublishedCaseInsights(workspaceId)
      .then((result) => { if (!cancelled) setItems(result); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const presentation = useMemo(() => new Map(items.map((item) => [item.id, getPresentation(item)])), [items]);
  const visibleItems = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return items
      .filter((item) => !domain || item.domainIds.includes(domain))
      .filter((item) => !text || [item.title, item.summary, item.company, ...item.domainIds.map(getDeptLabel), ...item.tags]
        .some((value) => value.toLocaleLowerCase().includes(text)))
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''));
  }, [domain, items, query]);

  if (loading) return <p className="py-14 text-center text-sm text-zinc-500">正在加载案例…</p>;
  if (error) return <div className="py-14 text-center text-sm text-red-600">案例加载失败，请稍后重试</div>;

  return (
    <section className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">{visibleItems.length} 篇案例</p>
        <label className="relative block w-full sm:max-w-xs">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索案例标题、公司或标签"
            aria-label="搜索案例"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#0071e3]/50 focus:ring-2 focus:ring-[#0071e3]/10"
          />
        </label>
      </div>

      {visibleItems.length ? (
        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          {visibleItems.map((item) => {
            const card = presentation.get(item.id);
            const date = publishedDate(item.publishedAt);
            return (
              <article key={item.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_208px] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                    {item.company ? <span className="font-medium text-zinc-700">{item.company}</span> : null}
                    {item.company && date ? <span aria-hidden="true">·</span> : null}
                    {date ? <time dateTime={item.publishedAt ?? undefined}>{date}</time> : null}
                  </div>
                  <a
                    href={articleUrl(workspaceId, item.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-left text-[16px] font-semibold leading-snug text-zinc-900 transition hover:text-[#0071e3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/30"
                  >
                    {item.title}
                  </a>
                  {item.summary ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-600">{item.summary}</p> : null}
                  {card?.practice ? (
                    <p className="mt-2 line-clamp-1 text-xs leading-relaxed text-zinc-600">
                      <span className="font-medium text-zinc-700">AI怎么落地：</span>{card.practice}
                    </p>
                  ) : card?.businessValue ? (
                    <p className="mt-2 line-clamp-1 text-xs leading-relaxed text-zinc-600">
                      <span className="font-medium text-zinc-700">业务价值：</span>{card.businessValue}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.domainIds.map((domainId, index) => (
                      <span key={`${item.id}-${domainId}`} className={index === 0
                        ? 'rounded-md bg-[#0071e3]/10 px-2 py-1 text-[10px] font-medium text-[#0064c8]'
                        : 'rounded-md bg-zinc-100 px-2 py-1 text-[10px] text-zinc-600'}>
                        {index === 0 ? '主领域 · ' : '关联 · '}{getDeptLabel(domainId)}
                      </span>
                    ))}
                    {item.tags.map((tag) => <span key={`${item.id}-${tag}`} className="rounded-md border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500">{tag}</span>)}
                  </div>
                </div>
                {card?.cover ? (
                  <a href={articleUrl(workspaceId, item.id)} target="_blank" rel="noopener noreferrer" aria-label={`查看案例：${item.title}`} className="order-first aspect-[16/9] w-full overflow-hidden rounded-lg bg-zinc-100 sm:order-none sm:aspect-[4/3]">
                    <img src={card.cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-200 hover:scale-[1.02]" />
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="border-y border-zinc-200 py-16 text-center text-sm text-zinc-500">
          {items.length ? '没有找到符合条件的案例' : '暂无已发布案例'}
        </div>
      )}
    </section>
  );
}
