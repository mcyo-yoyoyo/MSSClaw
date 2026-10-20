import { PrismaClient } from '@prisma/client';
import { readAssets, readToolCatalogMeta, replaceAssets, writeToolCatalogMeta } from '../src/persistence/asset-catalog';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  EXTERNAL_TOOLS_EXCEL,
  EXTERNAL_TOOLS_EXCEL_VERSION,
} from '../src/data/external-tools-excel-v1-0-5';
import {
  INTERNAL_TOOLS_EXCEL,
  INTERNAL_TOOLS_EXCEL_VERSION,
} from '../src/data/internal-tools-excel-v1-0-5';

type JsonRecord = Record<string, unknown>;

const prisma = new PrismaClient();
const workspaceId = process.argv[2] || 'ws-cn-marketing';
const workbookPath = process.argv[3] || path.resolve(
  __dirname,
  '../../../..',
  '2026_09_01-工具清单',
  'mssclaw-skills-agents-ws-cn-marketing.xlsx',
);
const excludedIds = new Set([
  'skill-submit-1787131266078',
  'agent-import-probe',
]);

function normalized(value: unknown): string {
  return String(value ?? '').replace(/^\u200b+/, '').trim();
}

function published(value: unknown): boolean {
  return ['是', 'yes', 'true', '1', 'published', 'online'].includes(normalized(value).toLowerCase());
}

function rows(workbook: XLSX.WorkBook, sheetName: string): JsonRecord[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`missing_sheet:${sheetName}`);
  return XLSX.utils.sheet_to_json<JsonRecord>(sheet, { range: 3, defval: '' });
}

function rawJsonById(
  workbook: XLSX.WorkBook,
  sheetName: string,
  idColumn: string,
): Map<string, JsonRecord> {
  const result = new Map<string, JsonRecord>();
  for (const row of rows(workbook, sheetName)) {
    const id = normalized(row[idColumn]);
    const raw = normalized(row['原始 JSON']);
    if (!id || !raw || excludedIds.has(id)) continue;
    try {
      const parsed = JSON.parse(raw) as JsonRecord;
      delete parsed.packageBlob;
      result.set(id, parsed);
    } catch {
      throw new Error(`invalid_original_json:${sheetName}:${id}`);
    }
  }
  return result;
}

function importPublished(
  workbook: XLSX.WorkBook,
  listSheet: string,
  configSheet: string,
  idColumn: string,
): JsonRecord[] {
  const configs = rawJsonById(workbook, configSheet, idColumn);
  return rows(workbook, listSheet)
    .filter((row) => published(row['已发布']))
    .map((row) => normalized(row[idColumn]))
    .filter((id) => id && !excludedIds.has(id))
    .map((id) => configs.get(id))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => ({ ...item, published: true }));
}

function externalToolId(name: string): string {
  const stable: Record<string, string> = {
    chatgpt: 'tool-saas-chatgpt',
    claude: 'tool-saas-claude',
    gemini: 'tool-saas-gemini',
    perplexity: 'tool-saas-perplexity',
    '豆包': 'tool-saas-doubao',
    deepseek: 'tool-saas-deepseek',
    kimi: 'tool-saas-kimi',
    qwen: 'tool-saas-tongyi',
  };
  const key = name.trim().toLowerCase();
  if (stable[key]) return stable[key];
  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `tool-excel-${slug || Buffer.from(name).toString('hex').slice(0, 20)}`;
}

function toolsFromCatalog(): JsonRecord[] {
  const external = EXTERNAL_TOOLS_EXCEL.map((record) => ({
    ...record,
    id: externalToolId(record.name),
    desc: record.cardSummary,
    category: 'external',
    author: record.company,
    published: true,
    invokes: 0,
    tags: ['ai-saas', ...record.toolTypeLabels],
    sourceType: 'external',
    visibility: 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    marketShelf: 'external',
  }));
  const internal = INTERNAL_TOOLS_EXCEL.map((record) => ({
    ...record,
    desc: record.cardSummary,
    category: 'platform',
    author: '华为内部',
    published: true,
    invokes: 0,
    tags: ['hw-internal'],
    sourceType: 'internal',
    visibility: 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    marketShelf: 'internal',
  }));
  return [...external, ...internal];
}

function mergeById(imported: JsonRecord[], existing: unknown): JsonRecord[] {
  const result = new Map<string, JsonRecord>();
  for (const item of imported) result.set(normalized(item.id), item);
  if (Array.isArray(existing)) {
    for (const item of existing) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const record = item as JsonRecord;
      const id = normalized(record.id);
      if (id) result.set(id, { ...result.get(id), ...record });
    }
  }
  return [...result.values()];
}

async function main() {
  const workbook = XLSX.readFile(workbookPath);
  const importedSkills = importPublished(workbook, 'Skill清单', 'Skill配置', 'Skill ID');
  const importedAgents = importPublished(workbook, 'Agent清单', 'Agent配置', 'Agent ID');
  const importedTools = toolsFromCatalog();
  // 第 3 期起资产在资产表里：已有记录的字段优先，清单只补新资产，写入在一个事务里。
  const [existingAgents, existingSkills, existingTools, meta] = await Promise.all([
    readAssets(prisma, 'agent'),
    readAssets(prisma, 'skill'),
    readAssets(prisma, 'tool'),
    readToolCatalogMeta(prisma),
  ]);
  const payload = {
    agents: mergeById(importedAgents, existingAgents),
    skills: mergeById(importedSkills, existingSkills),
    tools: mergeById(importedTools, existingTools),
  };
  await prisma.$transaction(async (tx) => {
    await replaceAssets(tx, 'agent', payload.agents);
    await replaceAssets(tx, 'skill', payload.skills);
    await replaceAssets(tx, 'tool', payload.tools);
    await writeToolCatalogMeta(tx, {
      ...meta,
      externalCatalogVersion: EXTERNAL_TOOLS_EXCEL_VERSION,
      internalCatalogVersion: INTERNAL_TOOLS_EXCEL_VERSION,
    });
  }, { timeout: 120_000 });

  console.log(JSON.stringify({
    workspaceId,
    tools: payload.tools.length,
    skills: payload.skills.length,
    agents: payload.agents.length,
    excluded: [...excludedIds],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
