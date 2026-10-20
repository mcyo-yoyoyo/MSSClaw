#!/usr/bin/env node
/**
 * 第 3 期：把 center_record 里的资产 JSON 拆进资产表（停机执行，先 pg_dump 备份）。
 *
 * 来源：
 *   - 工具：id=global-tools 的 tools[]，目录元数据（版本号、initialized 等）写进 app_setting('tool-catalog.meta')
 *   - Skill / Agent / 自动化 / 知识库文档：kind=marketplace 那一行（平台空间只有一行）
 * 写入后删除 global-tools、marketplace 行和 kind=agent/skill/tool 的投影行（新代码不再读它们）。
 *
 * 用法（apps/api 目录）：
 *   npm run migrate:assets             只读预览：逐条校验，列出不合格的资产
 *   npm run migrate:assets -- --apply  写入：资产表必须为空，写入与删除旧行在一个事务里，失败整体回滚
 */
import { PrismaClient } from '@prisma/client';
import {
  prepareAssets,
  readAssets,
  replaceAssets,
  writeToolCatalogMeta,
} from '../dist/persistence/asset-catalog.js';
import { centerRecord } from './lib/center-record.mjs';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** 读回来的 JSON 不输出空值；对比时源数据也去掉 null，空 versions 数组同理 */
function comparable(kind, item) {
  const out = {};
  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined) continue;
    if (kind === 'skill' && key === 'versions' && Array.isArray(value) && !value.length) continue;
    out[key] = value;
  }
  return sortKeys(out);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  return value;
}

async function main() {
  const [globalTools, marketplaceRows, projections] = await Promise.all([
    centerRecord(prisma).findUnique({ where: { id: 'global-tools' } }),
    centerRecord(prisma).findMany({ where: { kind: 'marketplace' } }),
    centerRecord(prisma).groupBy({ by: ['kind'], where: { kind: { in: ['agent', 'skill', 'tool'] } }, _count: true }),
  ]);
  if (marketplaceRows.length > 1) {
    throw new Error(`有 ${marketplaceRows.length} 行 marketplace（${marketplaceRows.map((row) => row.id).join('，')}），只应有平台空间那一行`);
  }
  const marketplace = isRecord(marketplaceRows[0]?.payload) ? marketplaceRows[0].payload : {};
  const toolCatalog = isRecord(globalTools?.payload) ? globalTools.payload : {};
  const lists = {
    tool: toolCatalog.tools,
    skill: marketplace.skills,
    agent: marketplace.agents,
    automation: marketplace.automations,
    kbDoc: marketplace.kbDocs,
  };

  console.log(`来源：global-tools ${globalTools ? '有' : '无'}，marketplace ${marketplaceRows[0]?.id ?? '无'}；投影行 ${projections.map((row) => `${row.kind} ${row._count}`).join('，') || '0'}`);
  let invalid = 0;
  for (const [kind, items] of Object.entries(lists)) {
    if (items !== undefined && !Array.isArray(items)) throw new Error(`${kind} 列表不是数组`);
    const errors = [];
    for (const item of items ?? []) {
      try {
        prepareAssets(kind, [item]);
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (!errors.length) {
      try {
        prepareAssets(kind, items ?? []);
      } catch (error) {
        errors.push(error.message);
      }
    }
    invalid += errors.length;
    console.log(`  ${kind.padEnd(11)} ${String((items ?? []).length).padStart(4)} 条${errors.length ? `，不合格 ${errors.length}：` : ''}`);
    errors.forEach((message) => console.log(`      ${message}`));
  }
  if (invalid) throw new Error('有不合格的资产，修正源数据后再执行');

  const meta = {
    externalCatalogVersion: toolCatalog.externalCatalogVersion ?? marketplace.externalCatalogVersion,
    internalCatalogVersion: toolCatalog.internalCatalogVersion ?? marketplace.internalCatalogVersion,
    initialized: toolCatalog.initialized === true || Boolean(toolCatalog.initializedAt),
    initializedAt: toolCatalog.initializedAt,
    migratedAt: toolCatalog.migratedAt,
  };
  console.log(`目录元数据：${JSON.stringify(meta)}`);

  if (!apply) {
    console.log('\n只读预览，未写入。确认无误后加 --apply 执行。');
    return;
  }

  const nonEmpty = [];
  for (const model of ['tool', 'skill', 'agent', 'automation', 'kbDocument']) {
    const count = await prisma[model].count();
    if (count) nonEmpty.push(`${model} ${count}`);
  }
  if (nonEmpty.length) throw new Error(`资产表不是空的（${nonEmpty.join('，')}），停止`);

  await prisma.$transaction(async (tx) => {
    for (const [kind, items] of Object.entries(lists)) await replaceAssets(tx, kind, items ?? []);
    await writeToolCatalogMeta(tx, meta);
    await centerRecord(tx).deleteMany({
      where: { OR: [{ id: 'global-tools' }, { kind: { in: ['marketplace', 'agent', 'skill', 'tool'] } }] },
    });
  }, { maxWait: 60_000, timeout: 600_000 });

  // 逐条读回对比源数据：除了「空值不输出」这类约定内的差异，内容必须一致。
  console.log('\n已写入，读回核对：');
  let differences = 0;
  for (const [kind, items] of Object.entries(lists)) {
    const stored = new Map((await readAssets(prisma, kind)).map((item) => [item.id, item]));
    const diffs = [];
    for (const source of items ?? []) {
      const back = stored.get(String(source.id).trim());
      const expected = comparable(kind, source);
      const actual = back ? comparable(kind, back) : null;
      if (!actual) {
        diffs.push(`${source.id}: 读不回来`);
        continue;
      }
      const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
      const changed = [...keys].filter((key) => JSON.stringify(expected[key]) !== JSON.stringify(actual[key]));
      if (changed.length) diffs.push(`${source.id}: ${changed.join(', ')}`);
    }
    differences += diffs.length;
    console.log(`  ${kind.padEnd(11)} ${stored.size} 条${diffs.length ? `，有差异 ${diffs.length}：` : '，一致'}`);
    diffs.forEach((line) => console.log(`      ${line}`));
  }
  console.log(differences ? '\n有差异，请逐条确认（invokes 缺省补 0、skillIds 去重属于预期）。' : '\n完成。');
}

main()
  .catch((error) => {
    console.error(`\n失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
