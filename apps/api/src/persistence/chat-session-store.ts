import { BadRequestException } from '@nestjs/common';
import { fromRow, inTransaction, replaceRows, type Db, type TableSpec } from './json-table';

/**
 * 会话 ↔ chat_session。接口形状不变（GET/PUT /sessions，{ chats: { [id]: chat } }），但只读写登录人看得见的：
 *   - 个人任务：owner 是本人，或没有 owner 的旧数据（谁先保存就归谁，与前端认领规则一致）；
 *   - WarRoom（type=group 或 sessionGroup=pinned）：成员表为空或含本人。
 * PUT 只动看得见的会话：body 里有的写入（个人任务 owner 强制为本人），看得见但 body 里没有的删除；
 * 别人的会话即使出现在 body 里也不动。
 */

type JsonRecord = Record<string, unknown>;

const CHAT_SESSION: TableSpec = {
  label: 'invalid_chat_session',
  model: 'chatSession',
  key: 'id',
  fields: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    type: { type: 'string', required: true },
    icon: { type: 'string', required: true },
    color: { type: 'string', required: true },
    status: { type: 'string' },
    history: { type: 'json', required: true },
    prompts: { type: 'json', required: true },
    sessionGroup: { type: 'string' },
    iconBg: { type: 'string' },
    badge: { type: 'string' },
    agentId: { type: 'string' },
    actionType: { type: 'string' },
    taskSource: { type: 'string' },
    businessScenarioId: { type: 'string' },
    skillId: { type: 'string' },
    ownerUserId: { type: 'string' },
    ownerEmail: { type: 'string' },
    createdAt: { type: 'epochMs' },
    pinnedAt: { type: 'epochMs' },
    adminId: { type: 'string' },
    members: { type: 'json' },
  },
};

type VisibilityRow = { id: string; type: string; sessionGroup: string | null; ownerUserId: string | null; members: unknown };

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isWarRoom(chat: { type?: unknown; sessionGroup?: unknown }): boolean {
  return chat.type === 'group' || chat.sessionGroup === 'pinned';
}

export function chatVisibleTo(chat: VisibilityRow, memberId: string): boolean {
  if (!isWarRoom(chat)) return !chat.ownerUserId || chat.ownerUserId === memberId;
  const members = Array.isArray(chat.members) ? chat.members : [];
  return !members.length || members.some((member) => isRecord(member) && member.id === memberId);
}

/** 候选行：本人的、无主的、所有 WarRoom；成员是否含本人在内存里再筛 */
const candidates = (memberId: string) => ({
  OR: [{ ownerUserId: memberId }, { ownerUserId: null }, { type: 'group' }, { sessionGroup: 'pinned' }],
});

export async function readChats(prisma: Db, memberId: string): Promise<Record<string, JsonRecord>> {
  const rows = await prisma.chatSession.findMany({
    where: candidates(memberId),
    orderBy: [{ createdAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
  });
  return Object.fromEntries(
    rows.filter((row) => chatVisibleTo(row, memberId)).map((row) => [row.id, fromRow(CHAT_SESSION, row)]),
  );
}

export async function writeChats(prisma: Db, memberId: string, chats: unknown) {
  if (!isRecord(chats)) throw new BadRequestException('chats_object_required');
  await inTransaction(prisma, async (tx) => {
    const existing = await tx.chatSession.findMany({
      select: { id: true, type: true, sessionGroup: true, ownerUserId: true, members: true },
    });
    const hidden = new Set(existing.filter((row) => !chatVisibleTo(row, memberId)).map((row) => row.id));
    const items: JsonRecord[] = [];
    for (const [id, raw] of Object.entries(chats)) {
      if (!isRecord(raw)) throw new BadRequestException(`invalid_chat_session:${id}:not_an_object`);
      if (hidden.has(id)) continue;
      const chat: JsonRecord = { ...raw, id };
      items.push(isWarRoom(chat) ? chat : { ...chat, ownerUserId: memberId });
    }
    const scope = existing.filter((row) => !hidden.has(row.id)).map((row) => row.id);
    // 范围只放看得见的 id（用 OR 包一层，免得被 replaceRows 的 id notIn 覆盖掉）
    await replaceRows(tx, CHAT_SESSION, items, { where: { OR: [{ id: { in: scope } }] } });
  });
  return { chats: await readChats(prisma, memberId) };
}

export const chatFromRow = (row: JsonRecord) => fromRow(CHAT_SESSION, row);

/** 迁移用：旧目录里的会话原样写入（不改 owner），校验规则与 PUT 相同 */
export async function importChats(db: Db, chats: Record<string, unknown>) {
  const items = Object.entries(chats).map(([id, raw]) => ({ ...(isRecord(raw) ? raw : {}), id }));
  await inTransaction(db, (tx) => replaceRows(tx, CHAT_SESSION, items, { where: { OR: [{ id: { in: [] } }] } }));
}
