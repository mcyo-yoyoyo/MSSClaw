import type { ChatConfig } from '@/domain/chat';
import { isWarRoom } from '@/domain/chat';
import { getCurrentUserId } from '@/domain/currentUser';
import type {
  PrototypeAgentSeed,
  PrototypeAutomation,
  PrototypeKbDocument,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  fetchMarketplaceApi,
  fetchSessionsApi,
  saveMarketplaceApi,
  saveSessionsApi,
} from '@/api/persistenceApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { reportShareSync } from '@/domain/shareSync';

export interface MarketplaceSnapshot {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  automations: PrototypeAutomation[];
  kbDocs: PrototypeKbDocument[];
}

export type MarketplaceSaveResult = {
  synced: boolean;
  reason?: 'offline' | 'failed';
  detail?: string;
};

const memorySessions = new Map<string, Record<string, ChatConfig>>();

function emptyMarketplace(): MarketplaceSnapshot {
  return {
    agents: [],
    skills: [],
    tools: [],
    automations: [],
    kbDocs: [],
  };
}

export async function loadMarketplace(workspaceId: string): Promise<MarketplaceSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchMarketplaceApi(workspaceId);
      if (remote) {
        return {
          agents: Array.isArray(remote.agents) ? (remote.agents as PrototypeAgentSeed[]) : [],
          skills: Array.isArray(remote.skills) ? (remote.skills as PrototypeSkillSeed[]) : [],
          tools: Array.isArray(remote.tools) ? (remote.tools as PrototypeToolSeed[]) : [],
          automations: Array.isArray(remote.automations)
            ? (remote.automations as PrototypeAutomation[])
            : [],
          kbDocs: Array.isArray(remote.kbDocs) ? (remote.kbDocs as PrototypeKbDocument[]) : [],
        };
      }
    } catch {
      /* fall through to local */
    }
  }
  return emptyMarketplace();
}

export async function saveMarketplace(
  workspaceId: string,
  snapshot: MarketplaceSnapshot,
): Promise<MarketplaceSaveResult> {
  if (!useWorkspaceStore.getState().apiConnected) {
    const result: MarketplaceSaveResult = { synced: false, reason: 'offline' };
    reportMarketplaceSync(result);
    return result;
  }
  try {
    await saveMarketplaceApi(workspaceId, snapshot);
    const result: MarketplaceSaveResult = { synced: true };
    reportMarketplaceSync(result);
    return result;
  } catch (err) {
    const result: MarketplaceSaveResult = {
      synced: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : undefined,
    };
    reportMarketplaceSync(result);
    return result;
  }
}

function reportMarketplaceSync(result: MarketplaceSaveResult) {
  reportShareSync({
    kind: 'marketplace',
    synced: result.synced,
    reason: result.reason,
    detail: result.detail,
  });
}

function readLocalSessions(workspaceId: string): Record<string, ChatConfig> | null {
  return memorySessions.get(workspaceId)
    ? structuredClone(memorySessions.get(workspaceId)!)
    : null;
}

function writeLocalSessions(workspaceId: string, chats: Record<string, ChatConfig>) {
  memorySessions.set(workspaceId, structuredClone(chats));
}

/**
 * 工作区会话对当前登录用户可见的子集：
 * - 协作空间：全员可见（仍受成员权限约束）
 * - 个人 AI 任务：仅 ownerUserId === 当前用户
 * - 无归属的旧个人任务：首次加载时认领给当前用户（迁移）
 */
export function filterSessionsForCurrentUser(
  chats: Record<string, ChatConfig>,
): Record<string, ChatConfig> {
  const uid = getCurrentUserId().trim();
  const email = useSessionStore.getState().user?.email?.trim() || undefined;
  const out: Record<string, ChatConfig> = {};
  for (const [id, raw] of Object.entries(chats)) {
    if (!raw) continue;
    if (isWarRoom(raw)) {
      out[id] = raw;
      continue;
    }
    if (!uid) continue;
    if (raw.ownerUserId && raw.ownerUserId !== uid) continue;
    if (!raw.ownerUserId) {
      out[id] = { ...raw, ownerUserId: uid, ownerEmail: email || raw.ownerEmail };
    } else {
      out[id] = raw;
    }
  }
  return out;
}

/** 将本机可见会话写回共享库：保留他人个人任务，替换本人个人任务与协作空间 */
function mergeSessionsForPersist(
  remote: Record<string, ChatConfig>,
  local: Record<string, ChatConfig>,
): Record<string, ChatConfig> {
  const uid = getCurrentUserId().trim();
  const next: Record<string, ChatConfig> = { ...remote };

  for (const id of Object.keys(next)) {
    const c = next[id];
    if (!c) continue;
    if (isWarRoom(c)) {
      // 协作空间以本地为准：若本地已删除则去掉
      if (!local[id]) delete next[id];
      continue;
    }
    if (uid && c.ownerUserId === uid) delete next[id];
  }

  for (const [id, c] of Object.entries(local)) {
    if (isWarRoom(c)) {
      next[id] = c;
      continue;
    }
    next[id] = {
      ...c,
      ownerUserId: c.ownerUserId || uid || c.ownerUserId,
      ownerEmail:
        c.ownerEmail || useSessionStore.getState().user?.email?.trim() || c.ownerEmail,
    };
  }
  return next;
}

export async function loadSessions(
  workspaceId: string,
): Promise<Record<string, ChatConfig> | null> {
  let raw: Record<string, ChatConfig> | null = null;
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      const remote = await fetchSessionsApi(workspaceId);
      if (remote && Object.keys(remote).length) raw = remote;
    } catch {
      /* fall through */
    }
  }
  if (!raw) raw = readLocalSessions(workspaceId);
  if (!raw) return null;
  const filtered = filterSessionsForCurrentUser(raw);
  writeLocalSessions(workspaceId, filtered);
  return filtered;
}

export async function saveSessions(
  workspaceId: string,
  chats: Record<string, ChatConfig>,
): Promise<MarketplaceSaveResult> {
  const owned = filterSessionsForCurrentUser(chats);
  writeLocalSessions(workspaceId, owned);
  if (!useWorkspaceStore.getState().apiConnected) {
    return { synced: false, reason: 'offline' };
  }
  try {
    let remote: Record<string, ChatConfig> = {};
    try {
      remote = (await fetchSessionsApi(workspaceId)) ?? {};
    } catch {
      remote = {};
    }
    const merged = mergeSessionsForPersist(remote, owned);
    await saveSessionsApi(workspaceId, merged);
    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSaveMarketplace(workspaceId: string, snapshot: MarketplaceSnapshot, ms = 600) {
  const key = `market:${workspaceId}`;
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void saveMarketplace(workspaceId, snapshot);
    }, ms),
  );
}

export function scheduleSaveSessions(workspaceId: string, chats: Record<string, ChatConfig>, ms = 600) {
  const key = `sessions:${workspaceId}`;
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void saveSessions(workspaceId, chats);
    }, ms),
  );
}
