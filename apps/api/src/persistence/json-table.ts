import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * 接口 JSON 条目 ↔ 表行（第 6 期各表共用，规则同第 3 期资产表）：
 *   - 未知键、类型不符、必填缺失一律拒绝，不悄悄丢字段；
 *   - 可选字段为空时读出不输出该键；
 *   - 有 position 的表按数组顺序存取。
 */

export type Db = PrismaService | Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

/** epochMs：JSON 里是毫秒数，库里是 timestamptz */
export type FieldType = 'string' | 'int' | 'bool' | 'json' | 'epochMs';

export interface FieldSpec {
  type: FieldType;
  required?: boolean;
  /** Prisma 字段名与 JSON 键不同时填 */
  column?: string;
}

export interface TableSpec {
  /** 错误码前缀，如 invalid_asset_approval */
  label: string;
  model: string;
  /** JSON 里的主键字段 */
  key: string;
  fields: Record<string, FieldSpec>;
  /** 几个 JSON 键合存进一个 jsonb 列：{ 列名: [键...] } */
  groups?: Record<string, readonly string[]>;
  position?: boolean;
}

/** 已在事务里（如迁移脚本整批写入）就直接用，否则新开一个 */
export function inTransaction<T>(db: Db, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return '$transaction' in db ? (db as PrismaService).$transaction(fn) : fn(db);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function typeMatches(type: FieldType, value: unknown): boolean {
  if (type === 'string') return typeof value === 'string';
  if (type === 'int') return Number.isInteger(value);
  if (type === 'bool') return typeof value === 'boolean';
  if (type === 'epochMs') return typeof value === 'number' && Number.isFinite(value);
  return true;
}

function invalid(spec: TableSpec, id: string, reason: string): never {
  throw new BadRequestException(`${spec.label}:${id || '(无 id)'}:${reason}`);
}

const columnOf = (key: string, field: FieldSpec) => field.column ?? key;

/** JSON 条目 → 行数据（含全部列，缺省的可选列写空值，便于整行覆盖） */
export function toRow(spec: TableSpec, raw: unknown, position?: number): JsonRecord {
  if (!isRecord(raw)) invalid(spec, '', 'not_an_object');
  const id = typeof raw[spec.key] === 'string' ? (raw[spec.key] as string).trim() : '';
  const grouped = new Map<string, string>();
  for (const [column, keys] of Object.entries(spec.groups ?? {})) for (const key of keys) grouped.set(key, column);
  const data: JsonRecord = {};
  const groups: Record<string, JsonRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    const field = spec.fields[key];
    if (field) {
      if (value === null) {
        if (field.required) invalid(spec, id, `${key}_required`);
        continue;
      }
      if (!typeMatches(field.type, value)) invalid(spec, id, `${key}_must_be_${field.type}`);
      data[columnOf(key, field)] = key === spec.key ? id : field.type === 'epochMs' ? new Date(value as number) : value;
    } else if (grouped.has(key)) {
      if (value !== null) (groups[grouped.get(key)!] ??= {})[key] = value;
    } else {
      invalid(spec, id, `unknown_field_${key}`);
    }
  }
  if (!id) invalid(spec, id, `${spec.key}_required`);
  for (const [key, field] of Object.entries(spec.fields)) {
    const column = columnOf(key, field);
    if (data[column] !== undefined) continue;
    if (field.required) invalid(spec, id, `${key}_required`);
    data[column] = field.type === 'json' ? Prisma.DbNull : null;
  }
  for (const column of Object.keys(spec.groups ?? {})) data[column] = groups[column] ?? Prisma.DbNull;
  if (spec.position) data.position = position ?? 0;
  return data;
}

/** 行 → JSON 条目：空列不输出 */
export function fromRow(spec: TableSpec, row: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const [key, field] of Object.entries(spec.fields)) {
    const value = row[columnOf(key, field)];
    if (value === null || value === undefined) continue;
    out[key] = field.type === 'epochMs' ? (value as Date).getTime() : value;
  }
  for (const [column, keys] of Object.entries(spec.groups ?? {})) {
    const group = row[column];
    if (!isRecord(group)) continue;
    for (const key of keys) if (group[key] !== undefined) out[key] = group[key];
  }
  return out;
}

interface Delegate {
  findMany(args: unknown): Promise<JsonRecord[]>;
  deleteMany(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<JsonRecord>;
}

function delegate(db: Db, spec: TableSpec): Delegate {
  return (db as unknown as Record<string, Delegate>)[spec.model];
}

function keyColumn(spec: TableSpec): string {
  return columnOf(spec.key, spec.fields[spec.key]);
}

function canonical(value: unknown): string {
  const sort = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(sort)
      : isRecord(input) && !(input instanceof Date)
        ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])]))
        : input;
  return JSON.stringify(sort(value));
}

export async function readRows(db: Db, spec: TableSpec, where: JsonRecord = {}): Promise<JsonRecord[]> {
  const rows = await delegate(db, spec).findMany({
    where,
    ...(spec.position ? { orderBy: { position: 'asc' } } : {}),
  });
  return rows.map((row) => fromRow(spec, row));
}

/**
 * 整份替换（限定在 where 范围内）：列表里没有的行删除，内容或顺序变了的行重写，其余不动。
 * fixed 是每行都要带的固定列（如 member_id），不出现在 JSON 里。调用方负责事务。
 */
export async function replaceRows(
  db: Db,
  spec: TableSpec,
  items: unknown[],
  options: { where?: JsonRecord; fixed?: JsonRecord } = {},
): Promise<void> {
  const where = options.where ?? {};
  const keyCol = keyColumn(spec);
  const seen = new Set<string>();
  const prepared = items.map((item, position) => {
    const data = { ...toRow(spec, item, position), ...(options.fixed ?? {}) };
    const id = String(data[keyCol]);
    if (seen.has(id)) invalid(spec, id, 'duplicate_id');
    seen.add(id);
    return { id, data, json: canonical({ item: fromRow(spec, plain(data)), position: data.position ?? 0 }) };
  });
  const model = delegate(db, spec);
  const existing = new Map(
    (await model.findMany({ where })).map((row) => [
      String(row[keyCol]),
      canonical({ item: fromRow(spec, row), position: row.position ?? 0 }),
    ]),
  );
  await model.deleteMany({ where: { ...where, [keyCol]: { notIn: prepared.map((item) => item.id) } } });
  for (const item of prepared) {
    if (existing.get(item.id) === item.json) continue;
    await model.upsert({ where: uniqueWhere(spec, item.data, options.fixed), create: item.data, update: item.data });
  }
}

/** DbNull 换回 null，便于和读出来的行做同样的规范化比较 */
function plain(data: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === Prisma.DbNull ? null : value]));
}

/** 单列主键用 { id }；带固定列的复合主键用 Prisma 的 a_b 组合键 */
function uniqueWhere(spec: TableSpec, data: JsonRecord, fixed?: JsonRecord): JsonRecord {
  const keyCol = keyColumn(spec);
  if (!fixed || !Object.keys(fixed).length) return { [keyCol]: data[keyCol] };
  const columns = [...Object.keys(fixed), keyCol];
  return { [columns.join('_')]: Object.fromEntries(columns.map((column) => [column, data[column]])) };
}
