import { PrismaClient } from '@prisma/client';
import { readAssets, replaceAssets } from '../src/persistence/asset-catalog';
import * as path from 'path';
import * as XLSX from 'xlsx';

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
  // 第 3 期起资产在资产表里：已有记录的字段优先，清单只补新资产，写入在一个事务里。
  const [existingAgents, existingSkills] = await Promise.all([
    readAssets(prisma, 'agent'),
    readAssets(prisma, 'skill'),
  ]);
  const payload = {
    agents: mergeById(importedAgents, existingAgents),
    skills: mergeById(importedSkills, existingSkills),
  };
  await prisma.$transaction(async (tx) => {
    await replaceAssets(tx, 'agent', payload.agents);
    await replaceAssets(tx, 'skill', payload.skills);
  }, { timeout: 120_000 });

  console.log(JSON.stringify({
    workspaceId,
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
