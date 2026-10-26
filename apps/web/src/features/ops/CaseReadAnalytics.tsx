import { useEffect, useState } from 'react';
import { fetchArticleReadReport, type ArticleReadPoint, type ArticleReadReport, type CaseInsightArticle } from '@/api/caseInsightsApi';

function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); }
function offset(date: string, days: number) { return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10); }

export function useCaseReadAnalytics() {
  const [range, setRange] = useState({ from: offset(today(), -6), to: today() });
  const [report, setReport] = useState<ArticleReadReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setReport(null); setError(''); setLoading(true);
    if (!range.from || !range.to || range.from > range.to || range.to > today() || Date.parse(range.to) - Date.parse(range.from) > 89 * 86400000) {
      setError('请选择不超过90天、且不晚于今天的有效日期区间'); setLoading(false); return;
    }
    void fetchArticleReadReport(range.from, range.to).then((data) => { if (active) setReport(data); })
      .catch(() => { if (active) setError('浏览数据加载失败，请检查后台连接后重试'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range.from, range.to, reload]);
  return { report, range, setRange, error, loading, refresh: () => setReload((value) => value + 1) };
}

function Trend({ points }: { points: ArticleReadPoint[] }) {
  const [metric, setMetric] = useState<'pv' | 'uv'>('pv');
  const max = Math.max(1, ...points.map((point) => point[metric]));
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><span className="text-xs font-medium">每日浏览趋势</span><select aria-label="趋势指标" value={metric} onChange={(event) => setMetric(event.target.value as 'pv' | 'uv')} className="rounded border border-zinc-200 p-1 text-xs"><option value="pv">浏览次数</option><option value="uv">浏览人数</option></select></div>
    <svg viewBox="0 0 720 130" className="h-32 w-full" role="img" aria-label={`每日${metric === 'pv' ? '浏览次数' : '浏览人数'}趋势，最高 ${max}`}>
      {[0, 1, 2].map((line) => <line key={line} x1="28" x2="710" y1={10 + line * 50} y2={10 + line * 50} stroke="#e4e4e7" />)}
      <text x="0" y="15" fontSize="10" fill="#71717a">{max}</text><text x="8" y="115" fontSize="10" fill="#71717a">0</text>
      <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={points.map((point, index) => `${28 + index * 680 / Math.max(1, points.length - 1)},${110 - point[metric] / max * 100}`).join(' ')} />
      {points.map((point, index) => <circle key={point.date} cx={28 + index * 680 / Math.max(1, points.length - 1)} cy={110 - point[metric] / max * 100} r="3" fill="#2563eb"><title>{point.date}：{point[metric]}</title></circle>)}
    </svg>
    <div className="flex justify-between text-[11px] text-zinc-500"><span>{points[0]?.date}</span><span>{points[points.length - 1]?.date}</span></div>
  </div>;
}

export function CaseReadOverview({ analytics }: { analytics: ReturnType<typeof useCaseReadAnalytics> }) {
  const { report, range, setRange, loading, error, refresh } = analytics;
  return <section aria-label="文章浏览统计" className="mb-6 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-semibold">文章浏览数据</h4><div className="flex flex-wrap items-center gap-2">
      {[7, 30].map((days) => <button key={days} type="button" onClick={() => setRange({ from: offset(today(), 1 - days), to: today() })} className="apple-btn-secondary px-2 py-1 text-xs">近{days}天</button>)}
      <input aria-label="浏览统计开始日期" type="date" value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} className="rounded border border-zinc-200 p-1 text-xs" /><span>至</span><input aria-label="浏览统计结束日期" type="date" value={range.to} min={range.from} max={today()} onChange={(event) => setRange({ ...range, to: event.target.value })} className="rounded border border-zinc-200 p-1 text-xs" />
      <button type="button" onClick={refresh} className="apple-btn-secondary px-2 py-1 text-xs">刷新</button>
    </div></div>
    {loading ? <p className="text-xs text-zinc-500">正在加载浏览数据…</p> : error ? <p role="alert" className="text-xs text-red-600">{error} <button type="button" onClick={refresh} className="underline">重试</button></p> : report ? <>
      <div className="grid grid-cols-3 divide-x divide-zinc-200 border-y border-zinc-200 py-4">{[['浏览次数', report.totals.pv], ['浏览人数', report.totals.uv], ['被浏览文章数', report.totals.articles]].map(([label, value]) => <div key={label} className="px-3"><p className="text-xs text-zinc-500">{label}</p><strong className="mt-2 block text-2xl font-semibold">{Number(value).toLocaleString('zh-CN')}</strong></div>)}</div>
      <details open><summary className="mb-3 cursor-pointer text-xs text-zinc-500">浏览趋势</summary><Trend points={report.series} /></details>
      <p className="text-[11px] text-zinc-500">包含游客与登录用户；分享直达计入详情浏览，后台预览不计入。</p>
    </> : null}
  </section>;
}

export function CaseReadDrawer({ article, report, onClose }: { article: CaseInsightArticle | null; report: ArticleReadReport | null; onClose: () => void }) {
  useEffect(() => {
    if (!article) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', close); previous?.focus(); };
  }, [article, onClose]);
  if (!article) return null;
  const row = report?.items.find((item) => item.id === article.id);
  return <div className="fixed inset-0 z-[100] flex justify-end"><div className="absolute inset-0 bg-black/30" onClick={onClose} /><section role="dialog" aria-modal="true" aria-label="文章浏览数据" className="relative h-full w-full max-w-xl overflow-auto bg-white p-6 shadow-xl">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{article.title}</h3><p className="mt-2 text-xs text-zinc-500">{article.company} · {article.publishedAt?.slice(0, 10) || '尚未发布'}</p></div><button autoFocus type="button" aria-label="关闭浏览数据" title="关闭浏览数据" onClick={onClose} className="h-9 w-9 shrink-0 rounded text-xl hover:bg-zinc-100">×</button></div>
    {report ? <div className="mt-6 space-y-6"><div className="grid grid-cols-2 gap-4 text-sm">{[['累计浏览次数',row?.lifetime.pv || 0],['累计浏览人数',row?.lifetime.uv || 0],['期间浏览次数',row?.pv || 0],['期间浏览人数',row?.uv || 0]].map(([label,value]) => <div key={label} className="border-b border-zinc-200 pb-3"><p className="text-xs text-zinc-500">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}</div><p className="text-xs text-zinc-500">{report.from} 至 {report.to}（北京时间）</p><Trend points={row?.series || report.series.map((point) => ({ ...point, pv:0, uv:0 }))} /><table className="w-full text-left text-xs"><thead><tr><th className="py-2">日期</th><th>浏览次数</th><th>浏览人数</th></tr></thead><tbody>{(row?.series || report.series.map((point) => ({ ...point,pv:0,uv:0 }))).map((point) => <tr key={point.date} className="border-t border-zinc-100"><td className="py-2">{point.date}</td><td>{point.pv}</td><td>{point.uv}</td></tr>)}</tbody></table></div> : <p className="mt-6 text-sm text-zinc-500">浏览数据暂不可用，请关闭后刷新重试。</p>}
  </section></div>;
}
