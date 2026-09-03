import { Injectable, Logger } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import * as XLSX from 'xlsx';

type CatalogItem = Record<string, unknown>;
type WorkbookCache = {
  path: string;
  modifiedAt: number;
  tools: CatalogItem[];
  skills: CatalogItem[];
  agents: CatalogItem[];
};

function value(row: CatalogItem, key: string): string {
  const raw = row[key];
  return typeof raw === 'string' ? raw.trim().replace(/^\u200b/, '') : '';
}

function tags(...values: string[]): string[] {
  return [...new Set(
    values.flatMap((entry) => entry.split(/[、；;，,·|/]+/).map((item) => item.trim()).filter(Boolean)),
  )];
}

function yes(value: string): boolean {
  return ['是', 'true', 'yes', '1'].includes(value.trim().toLowerCase());
}

function rowsFromSheet(
  worksheet: XLSX.WorkSheet | undefined,
  headerRowNumber: number,
): CatalogItem[] {
  if (!worksheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const headers = matrix[headerRowNumber - 1] ?? [];
  const rows: CatalogItem[] = [];
  for (const excelRow of matrix.slice(headerRowNumber)) {
    const item: CatalogItem = {};
    let populated = false;
    for (let column = 0; column < headers.length; column += 1) {
      const header = String(headers[column] ?? '').trim();
      if (!header) continue;
      const text = String(excelRow[column] ?? '').trim().replace(/^\u200b/, '');
      if (text) populated = true;
      item[header] = text;
    }
    if (populated) rows.push(item);
  }
  return rows;
}

@Injectable()
export class AiKnowledgeXlsxCatalogService {
  private readonly logger = new Logger(AiKnowledgeXlsxCatalogService.name);
  private cache: WorkbookCache[] = [];

  async loadTools(): Promise<CatalogItem[]> {
    const path = (process.env.AI_TOOL_CATALOG_XLSX_PATH ?? '').trim();
    if (!path) return [];
    const cached = await this.load(path, 'tools');
    return cached.tools;
  }

  async loadCapabilities(): Promise<{ skills: CatalogItem[]; agents: CatalogItem[] }> {
    const path = (process.env.AI_CAPABILITY_CATALOG_XLSX_PATH ?? '').trim();
    if (!path) return { skills: [], agents: [] };
    const cached = await this.load(path, 'capabilities');
    return { skills: cached.skills, agents: cached.agents };
  }

  private async load(path: string, type: 'tools' | 'capabilities'): Promise<WorkbookCache> {
    try {
      const info = await stat(path);
      const existing = this.cache.find((item) => item.path === path && item.modifiedAt === info.mtimeMs);
      if (existing) return existing;
      const workbook = XLSX.readFile(path, { cellText: true, cellDates: false });
      const parsed = type === 'tools'
        ? this.parseTools(workbook)
        : this.parseCapabilities(workbook);
      const next: WorkbookCache = { path, modifiedAt: info.mtimeMs, ...parsed };
      this.cache = [...this.cache.filter((item) => item.path !== path), next];
      this.logger.log(
        `Loaded AI catalog workbook: tools=${next.tools.length}, skills=${next.skills.length}, agents=${next.agents.length}`,
      );
      return next;
    } catch (error) {
      this.logger.warn(
        `Unable to load AI catalog workbook ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { path, modifiedAt: 0, tools: [], skills: [], agents: [] };
    }
  }

  private parseTools(workbook: XLSX.WorkBook): Omit<WorkbookCache, 'path' | 'modifiedAt'> {
    const external = rowsFromSheet(workbook.Sheets['工具目录'], 1).map((row) => ({
      id: `xlsx-tool-${value(row, '序号')}`,
      name: value(row, '产品名'),
      description: [value(row, '卡片核心作用'), value(row, '产品详细介绍'), value(row, '最适合')]
        .filter(Boolean).join('\n'),
      url: value(row, '访问链接'),
      tags: tags(
        value(row, '区域'),
        value(row, '工具类型'),
        value(row, '核心能力'),
        value(row, '公司'),
      ),
      source: 'AI工具完整清单',
    }));
    const internal = rowsFromSheet(workbook.Sheets['内部工具'], 3).map((row, index) => ({
      id: `xlsx-internal-tool-${index + 1}`,
      name: value(row, '产品名'),
      description: [value(row, '卡片核心作用'), value(row, '产品详细介绍'), value(row, '适用场景')]
        .filter(Boolean).join('\n'),
      url: value(row, '立即体验链接'),
      tags: tags(value(row, '核心能力'), value(row, '适用场景'), '内部工具'),
      source: 'AI工具完整清单',
    }));
    return {
      tools: [...external, ...internal].filter((item) => item.name),
      skills: [],
      agents: [],
    };
  }

  private parseCapabilities(workbook: XLSX.WorkBook): Omit<WorkbookCache, 'path' | 'modifiedAt'> {
    const skillList = rowsFromSheet(workbook.Sheets['Skill清单'], 4);
    const skillConfig = new Map(
      rowsFromSheet(workbook.Sheets['Skill配置'], 4)
        .map((row) => [value(row, 'Skill ID'), row] as const),
    );
    const skills = skillList
      .filter((row) => yes(value(row, '已发布')) && yes(value(row, '可调用')))
      .map((row) => {
        const config = skillConfig.get(value(row, 'Skill ID')) ?? {};
        return {
          id: value(row, 'Skill ID'),
          name: value(row, '名称'),
          description: [
            value(config, '简介'),
            value(row, '业务场景'),
            value(row, '调用指令'),
            value(config, '使用说明'),
          ].filter(Boolean).join(' · '),
          tags: tags(
            value(row, '分类'),
            value(row, '业务场景'),
            value(row, '标签'),
            value(row, '搜索关键词'),
          ),
          source: '已上线 Skill/Agent 清单',
        };
      });
    const agentList = rowsFromSheet(workbook.Sheets['Agent清单'], 4);
    const agentConfig = new Map(
      rowsFromSheet(workbook.Sheets['Agent配置'], 4)
        .map((row) => [value(row, 'Agent ID'), row] as const),
    );
    const agents = agentList
      .filter((row) => yes(value(row, '已发布')))
      .map((row) => {
        const config = agentConfig.get(value(row, 'Agent ID')) ?? {};
        return {
          id: value(row, 'Agent ID'),
          name: value(row, '名称'),
          description: [
            value(config, '简介'),
            value(row, '业务场景'),
            value(config, '挂载Skill名称'),
          ].filter(Boolean).join(' · '),
          tags: tags(
            value(row, '分类'),
            value(row, '业务线'),
            value(row, '首页标签'),
            value(row, '业务场景'),
            value(config, '归属部门'),
            value(config, '归属区域'),
            value(config, '场景标签'),
          ),
          source: '已上线 Skill/Agent 清单',
        };
      });
    return {
      tools: [],
      skills: skills.filter((item) => item.id && item.name),
      agents: agents.filter((item) => item.id && item.name),
    };
  }
}
