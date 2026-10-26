import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'node:crypto';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';
import { portalAnalyticsDateKey, shiftPortalAnalyticsDateKey } from './portal-analytics-time';

type ArticleInput = {
  sourceCaseId?: string | null;
  title?: string;
  summary?: string;
  company?: string;
  sourceUrl?: string;
  domainIds?: string[];
  tags?: string[];
  html?: string;
  coverImage?: string | null;
  sortOrder?: number;
  version?: number;
};

function stringField(value: unknown, limit: number, name: string): string {
  if (typeof value !== 'string' || value.trim().length > limit) {
    throw new BadRequestException(`invalid_case_${name}`);
  }
  return value.trim();
}

function stringList(value: unknown, name: string, limit: number): string[] {
  if (!Array.isArray(value) || value.length > limit || value.some((item) => typeof item !== 'string' || item.length > 60)) {
    throw new BadRequestException(`invalid_case_${name}`);
  }
  return [...new Set(value.map((item: string) => item.trim()).filter(Boolean))];
}

/** 对象存储中的图片地址：同源相对路径，或跨域 API 基址下的绝对地址；带工作区的旧地址仍接受（会被 301 到新地址）。 */
const BLOB_IMAGE_URL = /^(?:https?:\/\/[^/\s]+)?\/api\/v1\/(?:workspaces\/[A-Za-z0-9_-]+\/)?blobs\/[0-9a-f]{32}$/;

function coverImageField(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new BadRequestException('invalid_case_cover_image');
  if (BLOB_IMAGE_URL.test(value)) return value;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length > 1_400_000) throw new BadRequestException('invalid_case_cover_image');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 1024 * 1024 || bytes.toString('base64') !== match[2]) {
    throw new BadRequestException('invalid_case_cover_image');
  }
  const mime = match[1].toLowerCase();
  const valid = mime === 'png'
    ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === 'jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new BadRequestException('invalid_case_cover_image');
  return value;
}

function parseInput(body: ArticleInput) {
  const sourceCaseId = body.sourceCaseId == null ? null : stringField(body.sourceCaseId, 180, 'source_id');
  const title = stringField(body.title, 180, 'title');
  const summary = stringField(body.summary, 600, 'summary');
  const company = stringField(body.company, 120, 'company');
  const sourceUrl = stringField(body.sourceUrl, 2000, 'source_url');
  const html = stringField(body.html, 1_000_000, 'html');
  const draftCoverImage = body.coverImage === undefined ? undefined : coverImageField(body.coverImage);
  const domainIds = stringList(body.domainIds, 'domains', 12);
  const tags = stringList(body.tags, 'tags', 20);
  if (!title || !html) throw new BadRequestException('case_title_and_body_required');
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new BadRequestException('invalid_case_source_url');
  if (!/<(?:!doctype\s+html|html|body|article)\b/i.test(html)) throw new BadRequestException('case_html_document_required');
  if (typeof body.sortOrder !== 'number' || !Number.isSafeInteger(body.sortOrder) || Math.abs(body.sortOrder) > 1_000_000) {
    throw new BadRequestException('invalid_case_sort_order');
  }
  return { sourceCaseId, title, summary, company, sourceUrl, draftHtml: html, draftMarkdown: '', domainIds, tags, sortOrder: body.sortOrder, ...(draftCoverImage === undefined ? {} : { draftCoverImage }) };
}

function asList(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

@Injectable()
export class CaseInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRead(id: string, userId: string, eventId: string) {
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(eventId)) throw new BadRequestException('invalid_read_event');
    const article = await this.prisma.caseInsightArticle.findFirst({
      where: { id, status: 'published', deletedAt: null },
      select: { publishedHtml: true, publishedMarkdown: true },
    });
    if (!article || (!article.publishedHtml && !article.publishedMarkdown)) throw new NotFoundException('article_not_published');
    // Retain the reader identity format so migrated historical events keep their UV identity.
    const visitorHash = createHash('sha256').update(`${PLATFORM_WORKSPACE_ID}:case-reader:${userId}`).digest('hex');
    try {
      await this.prisma.marketEngagementEvent.create({ data: {
        eventId: `case-read:${eventId}`, contentId: id, assetType: 'case-insight', action: 'case_read',
        dateKey: portalAnalyticsDateKey(), visitorHash, visitorType: 'user',
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return { ok: true };
  }

  async readReport(from?: string, to?: string) {
    const today = portalAnalyticsDateKey();
    const end = to || today;
    const start = from || shiftPortalAnalyticsDateKey(today, -6);
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value + 'T00:00:00Z'))
      && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
    if (!validDate(start) || !validDate(end) || start > end || end > today
      || (Date.parse(end) - Date.parse(start)) / 86400000 > 89) throw new BadRequestException('invalid_read_date_range');
    const where = { assetType: 'case-insight', action: 'case_read' };
    const [groups, first] = await Promise.all([
      this.prisma.marketEngagementEvent.groupBy({ by: ['contentId', 'dateKey', 'visitorHash'], where, _count: { _all: true } }),
      this.prisma.marketEngagementEvent.findFirst({ where, orderBy: { occurredAt: 'asc' }, select: { occurredAt: true } }),
    ]);
    type Counts = { pv: number; readers: Set<string> };
    const make = (): Counts => ({ pv: 0, readers: new Set() });
    const totals = make();
    const articles = new Map<string, { period: Counts; lifetime: Counts; daily: Map<string, Counts> }>();
    const daily = new Map<string, Counts>();
    for (let date = start; date <= end; date = shiftPortalAnalyticsDateKey(date, 1)) daily.set(date, make());
    const add = (counter: Counts, count: number, visitor: string | null) => {
      counter.pv += count;
      if (visitor) counter.readers.add(visitor);
    };
    for (const group of groups) {
      if (!articles.has(group.contentId)) articles.set(group.contentId, { period: make(), lifetime: make(), daily: new Map() });
      const row = articles.get(group.contentId)!;
      add(row.lifetime, group._count._all, group.visitorHash);
      if (group.dateKey < start || group.dateKey > end) continue;
      add(row.period, group._count._all, group.visitorHash);
      add(totals, group._count._all, group.visitorHash);
      add(daily.get(group.dateKey)!, group._count._all, group.visitorHash);
      if (!row.daily.has(group.dateKey)) row.daily.set(group.dateKey, make());
      add(row.daily.get(group.dateKey)!, group._count._all, group.visitorHash);
    }
    const counts = (value: Counts) => ({ pv: value.pv, uv: value.readers.size });
    const series = (values: Map<string, Counts>) => [...daily.keys()].map(date => ({ date, ...counts(values.get(date) || make()) }));
    return { from: start, to: end, timezone: 'Asia/Shanghai', updatedAt: new Date().toISOString(),
      trackingStartedAt: first?.occurredAt.toISOString() || null,
      totals: { ...counts(totals), articles: [...articles.values()].filter(row => row.period.pv > 0).length },
      series: series(daily), items: [...articles].map(([id, row]) => ({ id, ...counts(row.period), lifetime: counts(row.lifetime), series: series(row.daily) })) };
  }

  async listPublished() {
    const rows = await this.prisma.caseInsightArticle.findMany({
      where: { status: 'published', deletedAt: null, OR: [{ publishedHtml: { not: null } }, { publishedMarkdown: { not: null } }] },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    return { items: rows.map((row) => ({
      id: row.id,
      title: row.publishedTitle,
      summary: row.publishedSummary,
      company: row.publishedCompany,
      sourceUrl: row.publishedSourceUrl,
      domainIds: asList(row.publishedDomainIds),
      tags: asList(row.publishedTags),
      html: row.publishedHtml,
      coverImage: row.publishedCoverImage,
      legacyMarkdown: row.publishedHtml ? null : row.publishedMarkdown,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    })) };
  }

  async listForOps(includeDeleted = false) {
    const rows = await this.prisma.caseInsightArticle.findMany({
      where: { ...(includeDeleted ? { deletedAt: { not: null } } : { deletedAt: null }) },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return { items: rows.map((row) => ({
      id: row.id,
      sourceCaseId: row.sourceCaseId,
      title: row.title,
      summary: row.summary,
      company: row.company,
      sourceUrl: row.sourceUrl,
      domainIds: asList(row.domainIds),
      tags: asList(row.tags),
      html: row.draftHtml,
      coverImage: row.draftCoverImage,
      legacyMarkdown: row.draftHtml ? null : row.draftMarkdown,
      status: row.status,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      deletedFromStatus: row.deletedFromStatus,
      sortOrder: row.sortOrder,
      version: row.version,
      publishedVersion: row.publishedVersion,
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    })) };
  }

  async create(body: ArticleInput) {
    const input = parseInput(body);
    const row = await this.prisma.caseInsightArticle.create({ data: input });
    return { id: row.id, version: row.version };
  }

  async update(id: string, body: ArticleInput) {
    const input = parseInput(body);
    if (!Number.isSafeInteger(body.version) || (body.version ?? 0) < 1) throw new BadRequestException('case_version_required');
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { id, version: body.version },
      data: { ...input, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: body.version! + 1 };
  }

  async setStatus(id: string, version: number, action: 'publish' | 'unpublish') {
    if (!Number.isSafeInteger(version) || version < 1) throw new BadRequestException('case_version_required');
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { id } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    if (action === 'publish' && (!row.title.trim() || !row.draftHtml.trim())) {
      throw new BadRequestException('case_title_body_required');
    }
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { id, version },
      data: action === 'publish'
        ? {
            status: 'published',
            publishedHtml: row.draftHtml,
            publishedCoverImage: row.draftCoverImage,
            publishedMarkdown: null,
            publishedTitle: row.title,
            publishedSummary: row.summary,
            publishedCompany: row.company,
            publishedSourceUrl: row.sourceUrl,
            publishedDomainIds: row.domainIds as Prisma.InputJsonValue,
            publishedTags: row.tags as Prisma.InputJsonValue,
            publishedVersion: version + 1,
            publishedAt: new Date(),
            version: { increment: 1 },
          }
        : { status: 'archived', version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: version + 1, status: action === 'publish' ? 'published' : 'archived' };
  }

  async delete(id: string, version: number) {
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { id, version },
      data: { deletedAt: new Date(), deletedFromStatus: row.status, status: row.status === 'published' ? 'archived' : row.status, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: version + 1, deleted: true };
  }

  async restore(id: string, version: number) {
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    const restoredStatus = row.deletedFromStatus === 'draft' ? 'draft' : 'archived';
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { id, version },
      data: { deletedAt: null, deletedFromStatus: null, status: restoredStatus, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: version + 1, status: restoredStatus };
  }
}
