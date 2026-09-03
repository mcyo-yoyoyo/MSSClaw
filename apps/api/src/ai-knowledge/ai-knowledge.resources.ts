import { Injectable, Logger } from '@nestjs/common';
import { readFile, stat } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import type { DemandDraft, SolutionResource } from './ai-knowledge.types';
import { matchesRequiredCaseIntent } from './ai-knowledge.relevance';

type ResourceKind = SolutionResource['kind'];
type CatalogItem = Record<string, unknown>;

type LocalCaseCache = {
  path: string;
  modifiedAt: number;
  items: CatalogItem[];
};

type WeightedField = {
  label: string;
  value: string;
  weight: number;
};

const LOW_SIGNAL_TERMS = new Set([
  '业务', '用户', '工作', '内容', '进行', '可以', '需要', '希望', '现在', '目前',
  '工具', '能力', '使用', '处理', '实现', '相关', '提供', '支持', '一个', '这个',
  '分析', '生成', '管理', '数据', '信息', '智能', '自动',
]);

function text(item: CatalogItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function strings(item: CatalogItem, ...keys: string[]): string[] {
  return keys.flatMap((key) => {
    const value = item[key];
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [];
  });
}

function terms(query: string): string[] {
  const normalized = query.toLowerCase().replace(/[\r\n]+/g, ' ');
  const words = normalized
    .split(/[\s,，。；;、/|：:（）()]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !LOW_SIGNAL_TERMS.has(word));
  const chineseChunks = normalized.match(/[\u3400-\u9fff]{2,}/g) ?? [];
  const bigrams = chineseChunks.flatMap((chunk) =>
    Array.from({ length: Math.max(0, chunk.length - 1) }, (_, index) => chunk.slice(index, index + 2)),
  );
  return [...new Set([...words, ...bigrams.filter((term) => !LOW_SIGNAL_TERMS.has(term))])].slice(0, 40);
}

function normalizedLimit(limit: number): number {
  return Math.min(Math.max(Math.floor(limit) || 1, 1), 8);
}

@Injectable()
export class AiKnowledgeResourceService {
  private readonly logger = new Logger(AiKnowledgeResourceService.name);
  private localCaseCache: LocalCaseCache | null = null;

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async searchCases(workspaceId: string, query: string, limit = 5): Promise<SolutionResource[]> {
    const [rows, localCases] = await Promise.all([
      this.prisma.centerRecord.findMany({
        where: { workspaceId, kind: { in: ['case', 'ai-case'] } },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      this.loadLocalCases(),
    ]);
    const databaseCases = rows.map((row) => row.payload as CatalogItem);
    return this.rank('case', [...databaseCases, ...localCases], query, 8)
      .filter((resource) => matchesRequiredCaseIntent(query, this.caseEvidenceText(resource)))
      .slice(0, normalizedLimit(limit));
  }

  async searchTools(workspaceId: string, query: string, limit = 5): Promise<SolutionResource[]> {
    const items = await this.marketplaceItems(workspaceId, 'tools');
    return this.rank('tool', items, query, normalizedLimit(limit));
  }

  async searchCapabilities(
    workspaceId: string,
    query: string,
    limit = 5,
  ): Promise<SolutionResource[]> {
    const [agents, skills] = await Promise.all([
      this.marketplaceItems(workspaceId, 'agents'),
      this.marketplaceItems(workspaceId, 'skills'),
    ]);
    const perKind = Math.max(2, Math.ceil(normalizedLimit(limit) / 2));
    return [
      ...this.rank('agent', agents, query, perKind),
      ...this.rank('skill', skills, query, perKind),
    ].slice(0, normalizedLimit(limit));
  }

  async searchForDraft(workspaceId: string, draft: DemandDraft): Promise<SolutionResource[]> {
    const query = [
      draft.originalQuestion,
      draft.demand.problem,
      draft.demand.goal,
      draft.demand.currentMethod,
      draft.demand.inputs,
      draft.demand.aiRole,
      draft.demand.humanCheckpoint,
      draft.demand.domain,
      draft.scenarioId === 'gtm-sellout' ? '预测 销量 渠道 数据分析' : '',
      draft.scenarioId === 'ecommerce-voc' ? '评论 翻译 电商 情绪 用户声音' : '',
      draft.scenarioId === 'mkt-campaign' ? '营销 活动 物料 合规 文档' : '',
    ].filter(Boolean).join(' ');
    const [cases, tools, capabilities] = await Promise.all([
      this.searchCases(workspaceId, query, 3),
      this.searchTools(workspaceId, query, 3),
      this.searchCapabilities(workspaceId, query, 4),
    ]);
    return this.unique([...cases, ...tools, ...capabilities]).slice(0, 10);
  }

  private rank(
    kind: ResourceKind,
    items: CatalogItem[],
    query: string,
    limit: number,
  ): SolutionResource[] {
    const queryTerms = terms(query);
    return items
      .map((item) => {
        const resource = this.toResource(kind, item);
        const fields = this.weightedFields(kind, item, resource);
        const matched = new Set<string>();
        const score = queryTerms.reduce((total, term) => {
          let termScore = 0;
          for (const field of fields) {
            if (!field.value.includes(term)) continue;
            termScore += field.weight * Math.min(term.length, 8);
            matched.add(field.label);
          }
          return total + termScore;
        }, 0);
        return {
          resource: {
            ...resource,
            relevanceScore: score,
            matchReasons: [...matched].slice(0, 5),
          },
          score,
        };
      })
      .filter(({ resource, score }) =>
        Boolean(resource.id && resource.label) && score >= this.minimumScore(kind),
      )
      .sort((left, right) => right.score - left.score)
      .filter((item, index, ranked) =>
        ranked.findIndex((candidate) => candidate.resource.id === item.resource.id) === index,
      )
      .slice(0, limit)
      .map(({ resource }) => resource);
  }

  private weightedFields(
    kind: ResourceKind,
    item: CatalogItem,
    resource: SolutionResource,
  ): WeightedField[] {
    const field = (label: string, weight: number, ...values: Array<string | string[] | undefined>) => ({
      label,
      weight,
      value: values.flatMap((value) => Array.isArray(value) ? value : [value ?? ''])
        .join(' ').toLowerCase(),
    });
    const capabilities = strings(item, 'coreCapabilities', 'searchKeywords', 'capabilityTypeIds');
    const scenarios = strings(
      item,
      'scenarioTags',
      'scenario_tags',
      'businessScenarioIds',
      'business_scenarios',
    );
    const categories = strings(
      item,
      'tags',
      'toolTypeLabels',
      'industry_tags',
      'value_tags',
      'mss_related_domains',
    );

    return [
      field('名称', 5, resource.label),
      field('核心能力', kind === 'case' ? 4 : 10, capabilities),
      field('适用场景', 8, scenarios, text(item, 'bestFor', 'businessScenario', '业务场景')),
      field('输入输出', 7, text(item, 'inputs', 'inputSchema', 'outputs', 'outputSchema')),
      field('分类标签', 4, categories),
      field('使用说明', 4, strings(item, 'usageGuide', 'planSteps'), text(item, 'usageNotes', 'instructions')),
      field('案例做法', kind === 'case' ? 10 : 0, text(item, 'ai_use_case'), strings(item, 'outline_zh')),
      field('借鉴意义', kind === 'case' ? 8 : 0, text(item, 'learnings')),
      field('使用工具', kind === 'case' ? 7 : 0, text(item, 'primary_product'), strings(item, 'tools_used', 'products')),
      field('案例结果', kind === 'case' ? 5 : 0, text(item, 'business_value'), strings(item, 'metrics')),
      field('摘要', 2, resource.description, text(item, 'cardSummary', 'desc', 'description')),
      field('详细介绍', 1, text(item, 'productIntro', 'summary_zh', 'business_value')),
      field('业务领域', 5, text(item, 'domain', 'mss_primary_domain', 'bizLine', 'homeTag')),
    ].filter((item) => item.weight > 0 && item.value.trim());
  }

  private minimumScore(kind: ResourceKind): number {
    return kind === 'case' ? 12 : 10;
  }

  private toResource(kind: ResourceKind, item: CatalogItem): SolutionResource {
    const id = text(item, 'id');
    const label = text(item, 'name', 'nameZh', 'title', 'title_zh', 'title_original');
    const description = [
      text(item, 'cardSummary', 'description', 'desc', 'summary_zh', 'business_value'),
      text(item, 'bestFor'),
      text(item, 'productIntro'),
    ].filter((value, index, values) => value && values.indexOf(value) === index)
      .join('；')
      .slice(0, 700);
    const tags = strings(
      item,
      'tags',
      'scenario_tags',
      'industry_tags',
      'value_tags',
      'toolTypeLabels',
      'coreCapabilities',
    );
    const capabilities = strings(item, 'coreCapabilities', 'searchKeywords', 'capabilityTypeIds');
    const scenarios = [
      ...strings(item, 'scenarioTags', 'businessScenarioIds', 'business_scenarios'),
      text(item, 'bestFor', 'businessScenario', '业务场景'),
    ].filter(Boolean);
    const company = text(item, 'company', 'company_name');
    const source = text(item, 'source');
    const toolsUsed = [
      ...strings(item, 'tools_used', 'products'),
      text(item, 'primary_product'),
    ].flatMap((value) => value.split(/[|、，,；;]+/))
      .map((value) => value.trim())
      .filter((value) => value && !/^(?:partner|source|vendor|tool|product)\s*:?$/i.test(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 6);
    const url = kind === 'case'
      ? this.localCaseUrl(id) || text(item, 'url', 'sourceUrl', 'source_url')
      : text(item, 'url', 'sourceUrl', 'homepageUrl', 'demoUrl');
    return {
      id: id || undefined,
      kind,
      label: label || id,
      description: description || undefined,
      url: url || undefined,
      evidence: [
        company,
        source || (kind === 'case' ? '' : 'MSS平台主数据'),
        capabilities.length ? `核心能力：${capabilities.slice(0, 5).join('、')}` : '',
        tags.length ? `分类：${tags.slice(0, 4).join('、')}` : '',
      ].filter(Boolean).join(' · ') || undefined,
      capabilities: capabilities.length ? capabilities : undefined,
      scenarios: scenarios.length ? [...new Set(scenarios)].slice(0, 8) : undefined,
      bestFor: text(item, 'bestFor') || undefined,
      caseApproach: kind === 'case'
        ? text(item, 'ai_use_case', 'summary_zh').slice(0, 1_000) || undefined
        : undefined,
      caseLearnings: kind === 'case' ? text(item, 'learnings').slice(0, 800) || undefined : undefined,
      caseResult: kind === 'case'
        ? [text(item, 'business_value'), strings(item, 'metrics').join('；')]
          .filter(Boolean).join('；').slice(0, 800) || undefined
        : undefined,
      toolsUsed: kind === 'case' && toolsUsed.length ? toolsUsed : undefined,
    };
  }

  private caseEvidenceText(resource: SolutionResource): string {
    return [
      resource.label,
      resource.description,
      resource.caseApproach,
      resource.caseLearnings,
      resource.caseResult,
      ...(resource.toolsUsed ?? []),
    ].filter(Boolean).join(' ');
  }

  private async marketplaceItems(
    workspaceId: string,
    key: 'tools' | 'skills' | 'agents',
  ): Promise<CatalogItem[]> {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: `marketplace-${workspaceId}` },
      select: { workspaceId: true, payload: true },
    });
    if (!row || row.workspaceId !== workspaceId) return [];
    const payload = row.payload as CatalogItem;
    const items = payload[key];
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is CatalogItem => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const record = item as CatalogItem;
      return record.published !== false;
    });
  }

  private async loadLocalCases(): Promise<CatalogItem[]> {
    const path = (process.env.AI_CASE_LIBRARY_DATA_PATH ?? '').trim();
    if (!path) return [];
    try {
      const info = await stat(path);
      if (this.localCaseCache?.path === path && this.localCaseCache.modifiedAt === info.mtimeMs) {
        return this.localCaseCache.items;
      }
      const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
      const items = Array.isArray(parsed)
        ? parsed.filter((item): item is CatalogItem => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
        : [];
      this.localCaseCache = { path, modifiedAt: info.mtimeMs, items };
      return items;
    } catch (error) {
      this.logger.warn(
        `Unable to load local AI case library: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private localCaseUrl(id: string): string {
    if (!id) return '';
    const base = (process.env.AI_CASE_LIBRARY_URL ?? '').trim();
    if (!base) return '';
    return `${base.replace(/index\.html$/, '').replace(/\/$/, '')}/cases/${encodeURIComponent(id)}.html`;
  }

  private unique(resources: SolutionResource[]): SolutionResource[] {
    const seen = new Set<string>();
    return resources.filter((resource) => {
      const label = resource.label.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
      const key = `${resource.kind}:${label || resource.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
