import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';

export type InsightSource = { id: string; kind: string; label: string; description: string; url?: string;
  publishedAt: string | null; dateLabel: string; contentLevel: 'summary' | 'body'; evidence: string;
  ref?: string; snippets?: Array<{ id: string; text: string }> };
export type InsightRange = { from: string | null; to: string; label: string };

export function insightRange(query: string, now = new Date()): InsightRange {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const midnight = new Date(`${day}T00:00:00+08:00`);
  let start: Date | null = null, label = '不限时间';
  const explicit = query.match(/(?:最近|近|过去)\s*(\d{1,3})\s*天/);
  if (explicit) { const days = Math.max(1, Math.min(365, Number(explicit[1]))); start = new Date(midnight.getTime() - (days - 1) * 86400000); label = `近${days}天`; }
  else if (/本月|这个月/.test(query)) { start = new Date(`${day.slice(0, 7)}-01T00:00:00+08:00`); label = '本月'; }
  else if (/本周|这周/.test(query)) { const weekday = new Date(midnight.getTime() + 8 * 3600000).getUTCDay(); start = new Date(midnight.getTime() - ((weekday + 6) % 7) * 86400000); label = '本周'; }
  else if (/最近|近期|近况|最新/.test(query)) { start = new Date(midnight.getTime() - 29 * 86400000); label = '近30天'; }
  return { from: start?.toISOString() ?? null, to: now.toISOString(), label };
}

export function publishedDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // 无时区的日期按中国本地日处理，不把抓取日期当成发布日期。
  const raw = value.trim();
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00+08:00` : raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function evidenceText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 独立问题只检索新主题；明确承接上文时才带入上一问。 */
export function insightQuery(text: string, previousQuestion: string): string {
  return /上面|上述|这些|这个|那个|该案例|它的|对我|继续/.test(text)
    ? [text, previousQuestion].filter(Boolean).join(' ') : text;
}

/** 模型选择短编号，后端从本次资料快照还原原文，避免抄写/标点改动造成失败。 */
export function attachInsightSnippets(sources: InsightSource[]): InsightSource[] {
  return sources.map((source, i) => {
    const body = evidenceText(source.description), snippets: Array<{ id: string; text: string }> = [];
    for (let start = 0; start < body.length; start += 160) {
      const text = body.slice(start, start + 180);
      if (text.length >= 8) snippets.push({ id: `s${snippets.length + 1}`, text });
    }
    return { ...source, ref: `r${i + 1}`, snippets };
  });
}

const STOP = new Set(['ai', '最近', '近期', '最新', '平台', '有什么', '哪些', '什么', '值得', '关注', '资料', '案例', '洞察', '看看', '了解', '可以', '如何', '帮我', '变化', '业务', '工作', '领域', '企业', '方面']);
function terms(query: string) {
  const words = query.toLowerCase().match(/[a-z][a-z0-9-]{1,}|[\u3400-\u9fff]+/g) ?? [];
  const expanded = [
    /营销|品牌|投放/.test(query) ? ['广告', '品牌', '投放', '营销', '创意', '流量'] : [],
    /用户研究|消费者洞察|用户洞察/.test(query) ? ['用户研究', '消费者', '用户访谈', '客户反馈', '用户画像', '调研', '评论分析'] : [],
    /服务领域|服务行业|客服|售后/.test(query) ? ['客服', '售后', '客户服务', '客户支持', '联系中心', '工单', '服务运营'] : [],
  ].flat();
  return [...new Set([...expanded, ...words.flatMap(w => /^[a-z]/.test(w) ? [w] : Array.from({ length: w.length - 1 }, (_, i) => w.slice(i, i + 2)))])]
    .filter(t => !STOP.has(t)).slice(0, 70);
}

export function rankInsightSources(sources: InsightSource[], query: string, range: InsightRange): InsightSource[] {
  const ts = terms(query), start = range.from ? Date.parse(range.from) : -Infinity, end = Date.parse(range.to);
  const seenUrls = new Set<string>(), seenTitles = new Set<string>();
  const score = (s: InsightSource) => ts.reduce((n, t) => n + (s.label.toLowerCase().includes(t) ? 6 : 0)
    + (s.description.toLowerCase().includes(t) ? 1 : 0), 0);
  return sources.filter(s => {
    if (!s.publishedAt) return !range.from;
    const date = Date.parse(s.publishedAt);
    return date >= start && date <= end;
  }).map(s => ({ source: s, score: score(s) }))
    .filter(s => !ts.length || s.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.source.publishedAt || '1970-01-01') - Date.parse(a.source.publishedAt || '1970-01-01'))
    .filter(({ source: s }) => {
      let url = '';
      try { const u = new URL(s.url || ''); u.hash = ''; for (const k of [...u.searchParams.keys()]) if (/^utm_|^fbclid$/.test(k)) u.searchParams.delete(k); url = u.href; } catch {}
      const title = s.label.toLowerCase().replace(/[\s\p{P}]/gu, '');
      if ((url && seenUrls.has(url)) || seenTitles.has(title)) return false;
      if (url) seenUrls.add(url); seenTitles.add(title); return true;
    }).slice(0, 12).map(s => s.source);
}

@Injectable()
export class AiKnowledgeInsightResources {
  constructor(private readonly prisma: PrismaService) {}
  async search(query: string, now = new Date(), inheritedRange?: InsightRange) {
    const range = inheritedRange ?? insightRange(query, now);
    const [feed, posts, articles, reports] = await Promise.all([
      this.prisma.aiNewsFeedItem.findMany({ take: 2001, orderBy: { publishedAt: 'desc' } }),
      this.prisma.aiNewsPost.findMany({ take: 301, orderBy: { publishedAt: 'desc' } }),
      this.prisma.caseInsightArticle.findMany({ where: { status: 'published', deletedAt: null }, take: 301, orderBy: { publishedAt: 'desc' } }),
      // 第一阶段只使用明确公开且有正文的报告，避免标题被模型当作已读全文。
      this.prisma.kbDocument.findMany({ where: { published: true, clearance: 'public' }, take: 101 }),
    ]);
    let local: Record<string, unknown>[] = [], localUnavailable = false;
    if (process.env.AI_CASE_LIBRARY_DATA_PATH) {
      try { const raw: unknown = JSON.parse(await readFile(process.env.AI_CASE_LIBRARY_DATA_PATH, 'utf8')); if (Array.isArray(raw)) local = raw.filter(c => c && typeof c === 'object' && !Array.isArray(c)).slice(0, 1000); } catch { localUnavailable = true; }
    }
    const string = (v: unknown) => typeof v === 'string' ? v : '';
    const source = (id: string, kind: string, title: string, body: string, url: string, date: string | null,
      contentLevel: 'summary' | 'body', dateLabel: string, evidence: string): InsightSource => ({ id, kind, label: title,
        description: evidenceText(body).slice(0, 2600), url, publishedAt: date, dateLabel, contentLevel, evidence });
    const reportSources = reports.flatMap(r => {
      const body = r.content || (Array.isArray(r.chunkTexts) ? r.chunkTexts.filter(x => typeof x === 'string').join('\n') : '');
      return body ? [source(`report:${r.id}`, 'report', r.title, body, `http://localhost:5173/#/knowledge`, publishedDate(r.sourceUpdatedAt), 'body', '资料更新时间', '公开报告正文')] : [];
    });
    const all: InsightSource[] = [
      ...feed.slice(0, 2000).map(n => source(`news:${n.id}`, 'news', n.title, n.summary, n.url, publishedDate(n.publishedAt), 'summary', '来源标注日期', 'AI快讯归档 · 仅摘要')),
      ...posts.slice(0, 300).map(n => source(`post:${n.id}`, 'news', n.title, n.body || n.summary || '', '', publishedDate(n.publishedAt), n.body ? 'body' : 'summary', '平台发布日期', '平台AI快讯')),
      ...articles.slice(0, 300).map(c => source(`article:${c.id}`, 'case', c.publishedTitle || '', c.publishedMarkdown || c.publishedHtml || c.publishedSummary || '',
        `http://localhost:5173/#/detail?type=case&id=${encodeURIComponent(c.id)}`, c.publishedAt?.toISOString() ?? null,
        c.publishedMarkdown || c.publishedHtml ? 'body' : 'summary', '平台发布日期', '已发布案例洞察')),
      ...local.filter(c => c.publication_status !== 'draft' && c.publication_status !== 'private' && c.publication_status !== 'unpublished').map(c => source(`local-case:${string(c.id)}`, 'case', string(c.title_zh) || string(c.title_original),
        [c.article_digest_zh, c.summary_zh, c.ai_use_case, c.business_value, c.learnings].map(string).filter(Boolean).join('\n'),
        string(c.source_url), publishedDate(c.published_at), string(c.article_digest_zh) ? 'body' : 'summary', '原文发布日期', '平台本地案例资料')),
      ...reportSources,
    ].filter(s => s.label && s.description);
    return { sources: rankInsightSources(all, query, range), range,
      coverage: { news: feed.length, platformCases: articles.length, localCases: local.length, reportsWithBody: reportSources.length,
        localUnavailable, truncated: feed.length > 2000 || posts.length > 300 || articles.length > 300 || reports.length > 100 } };
  }
}
