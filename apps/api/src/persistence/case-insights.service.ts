import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

function coverImageField(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new BadRequestException('invalid_case_cover_image');
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

  async listPublished(workspaceId: string) {
    const rows = await this.prisma.caseInsightArticle.findMany({
      where: { workspaceId, status: 'published', deletedAt: null, OR: [{ publishedHtml: { not: null } }, { publishedMarkdown: { not: null } }] },
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

  async listForOps(workspaceId: string, includeDeleted = false) {
    const rows = await this.prisma.caseInsightArticle.findMany({
      where: { workspaceId, ...(includeDeleted ? { deletedAt: { not: null } } : { deletedAt: null }) },
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

  async create(workspaceId: string, body: ArticleInput) {
    const input = parseInput(body);
    const row = await this.prisma.caseInsightArticle.create({ data: { ...input, workspaceId } });
    return { id: row.id, version: row.version };
  }

  async update(workspaceId: string, id: string, body: ArticleInput) {
    const input = parseInput(body);
    if (!Number.isSafeInteger(body.version) || (body.version ?? 0) < 1) throw new BadRequestException('case_version_required');
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { workspaceId, id, version: body.version },
      data: { ...input, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: body.version! + 1 };
  }

  async setStatus(workspaceId: string, id: string, version: number, action: 'publish' | 'unpublish') {
    if (!Number.isSafeInteger(version) || version < 1) throw new BadRequestException('case_version_required');
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { workspaceId, id } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    if (action === 'publish' && (!row.title.trim() || !row.draftHtml.trim())) {
      throw new BadRequestException('case_title_body_required');
    }
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { workspaceId, id, version },
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

  async delete(workspaceId: string, id: string, version: number) {
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { workspaceId, id, deletedAt: null } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { workspaceId, id, version },
      data: { deletedAt: new Date(), deletedFromStatus: row.status, status: row.status === 'published' ? 'archived' : row.status, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: version + 1, deleted: true };
  }

  async restore(workspaceId: string, id: string, version: number) {
    const row = await this.prisma.caseInsightArticle.findFirst({ where: { workspaceId, id, deletedAt: { not: null } } });
    if (!row) throw new NotFoundException('case_not_found');
    if (row.version !== version) throw new ConflictException('case_revision_conflict');
    const restoredStatus = row.deletedFromStatus === 'draft' ? 'draft' : 'archived';
    const result = await this.prisma.caseInsightArticle.updateMany({
      where: { workspaceId, id, version },
      data: { deletedAt: null, deletedFromStatus: null, status: restoredStatus, version: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('case_revision_conflict');
    return { id, version: version + 1, status: restoredStatus };
  }
}
