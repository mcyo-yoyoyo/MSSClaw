import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export type OperationModule = 'skill' | 'agent' | 'tool' | 'office-scene';
export type OperationAction = 'create' | 'update' | 'delete';

export interface OperationActor {
  name: string;
  email?: string | null;
  role?: string | null;
  deptIds?: string[];
  regionId?: string | null;
}

export interface OperationChange {
  action: OperationAction;
  id: string;
  name: string;
  /** 不传时按「新增了 Skill「名称」」这种句子生成 */
  detail?: string;
}

export interface OperationLogEntry {
  id: string;
  at: string;
  module: OperationModule;
  action: OperationAction;
  targetId: string;
  targetName: string;
  detail: string;
  userName: string;
  userEmail: string | null;
  role: string | null;
}

const MODULES: OperationModule[] = ['skill', 'agent', 'tool', 'office-scene'];
const ACTIONS: OperationAction[] = ['create', 'update', 'delete'];

const MODULE_LABEL: Record<OperationModule, string> = {
  skill: 'Skill',
  agent: 'Agent',
  tool: '工具',
  'office-scene': '办公场景',
};

const ACTION_LABEL: Record<OperationAction, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
};

export function operationActorFrom(user: {
  name?: unknown;
  email?: unknown;
  platformRole?: unknown;
  deptIds?: unknown;
  regionId?: unknown;
} | null | undefined): OperationActor {
  const name = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : '未登录';
  return {
    name,
    email: typeof user?.email === 'string' ? user.email : null,
    role: typeof user?.platformRole === 'string' ? user.platformRole : null,
    deptIds: Array.isArray(user?.deptIds) ? user.deptIds.filter((id): id is string => typeof id === 'string') : [],
    regionId: typeof user?.regionId === 'string' ? user.regionId : null,
  };
}

function isModule(value: string): value is OperationModule {
  return (MODULES as string[]).includes(value);
}

function isAction(value: string): value is OperationAction {
  return (ACTIONS as string[]).includes(value);
}

function sentence(module: OperationModule, change: OperationChange): string {
  if (change.detail) return change.detail;
  return `${ACTION_LABEL[change.action]}了${MODULE_LABEL[module]}「${change.name}」`;
}

/** 只追加。没有变更时不写。操作日志失败不应由调用方吞掉：和这次保存放在同一事务里。 */
export async function appendOperationLogs(
  db: Db,
  actor: OperationActor | undefined,
  module: OperationModule,
  changes: OperationChange[],
): Promise<void> {
  if (!actor || changes.length === 0) return;
  const now = new Date();
  await db.auditLog.createMany({
    data: changes.map((change) => ({
      entryId: `op_${randomUUID()}`,
      occurredAt: now,
      category: 'asset',
      action: change.action,
      module,
      detail: sentence(module, change),
      actorName: actor.name.trim() || '未登录',
      actorEmail: actor.email ?? null,
      actorRole: actor.role ?? null,
      deptIds: actor.deptIds?.length ? actor.deptIds : Prisma.DbNull,
      regionId: actor.regionId ?? null,
    })),
  });
}

export async function listOperationLogs(
  db: Db,
  filter: { module?: string; query?: string } = {},
): Promise<OperationLogEntry[]> {
  const module = filter.module && isModule(filter.module) ? filter.module : undefined;
  const rows = await db.auditLog.findMany({
    where: {
      category: 'asset',
      action: { in: ACTIONS },
      module: module ?? { in: MODULES },
    },
    orderBy: [{ occurredAt: 'desc' }, { no: 'desc' }],
    take: 300,
  });
  const query = filter.query?.trim().toLowerCase();
  return rows.flatMap((row) => {
    if (!isModule(row.module) || !isAction(row.action)) return [];
    const targetName = nameFromDetail(row.detail, row.action, row.module);
    const entry: OperationLogEntry = {
      id: row.entryId,
      at: row.occurredAt.toISOString(),
      module: row.module,
      action: row.action,
      targetId: '',
      targetName,
      detail: row.detail,
      userName: row.actorName,
      userEmail: row.actorEmail,
      role: row.actorRole,
    };
    if (!query) return [entry];
    const haystack = `${entry.userName} ${entry.userEmail ?? ''} ${entry.detail} ${entry.targetName}`.toLowerCase();
    return haystack.includes(query) ? [entry] : [];
  });
}

function nameFromDetail(detail: string, action: string, module: string): string {
  const label = isModule(module) ? MODULE_LABEL[module] : module;
  const verb = isAction(action) ? ACTION_LABEL[action] : action;
  const prefix = `${verb}了${label}「`;
  if (detail.startsWith(prefix) && detail.endsWith('」')) {
    return detail.slice(prefix.length, -1);
  }
  return detail;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** 办公场景按条目内容比较。只调整顺序时记一条，不把每条都记成修改。 */
export function diffOfficeScenes(
  before: Array<{ id: string; label?: string }>,
  after: Array<{ id: string; label?: string }>,
): OperationChange[] {
  const prev = new Map(before.map((entry) => [entry.id, JSON.stringify(sortKeys(entry))]));
  const next = new Map(after.map((entry) => [entry.id, entry]));
  const changes: OperationChange[] = [];
  for (const entry of before) {
    if (!next.has(entry.id)) {
      changes.push({ action: 'delete', id: entry.id, name: entry.label?.trim() || entry.id });
    }
  }
  for (const entry of after) {
    const previous = prev.get(entry.id);
    const name = entry.label?.trim() || entry.id;
    if (!previous) changes.push({ action: 'create', id: entry.id, name });
    else if (previous !== JSON.stringify(sortKeys(entry))) changes.push({ action: 'update', id: entry.id, name });
  }
  const sameIds =
    before.length === after.length && before.every((entry) => next.has(entry.id));
  const orderChanged = sameIds && before.some((entry, index) => after[index]?.id !== entry.id);
  if (orderChanged && changes.length === 0) {
    changes.push({
      action: 'update',
      id: 'order',
      name: '排列顺序',
      detail: '调整了办公场景的排列顺序',
    });
  }
  return changes;
}
