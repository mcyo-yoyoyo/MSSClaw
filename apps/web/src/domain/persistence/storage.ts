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
  fetchToolsApi,
  fetchMarketplaceApi,
  fetchSessionsApi,
  saveToolsApi,
  saveMarketplaceApi,
  saveSessionsApi,
  type ToolCatalogPayload,
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

/** workspace marketplace 中不再写入 tools，避免旧工具快照覆盖全局目录。 */
export type WorkspaceMarketplaceSnapshot = Omit<MarketplaceSnapshot, 'tools'>;

/** 部署级共享工具目录；不携带 workspace 维度。 */
export type ToolCatalogSnapshot = ToolCatalogPayload;

export type MarketplaceSaveResult = {
  synced: boolean;
  reason?: 'offline' | 'failed';
  detail?: string;
};

type MarketplaceSaveOptions = {
  /** Some callers keep the draft open and show a context-specific error themselves. */
  reportFailure?: boolean;
};

let memorySessions: Record<string, ChatConfig> | null = null;

function emptyMarketplace(): MarketplaceSnapshot {
  return {
    agents: [],
    skills: [],
    tools: [],
    automations: [],
    kbDocs: [],
  };
}

function emptyToolCatalog(): ToolCatalogSnapshot {
  return { tools: [] };
}

/** 从全局工具 API 读取目录。 */
export async function loadTools(
  options?: { throwOnRemoteError?: boolean },
): Promise<ToolCatalogSnapshot> {
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      const remote = await fetchToolsApi();
      if (remote && Array.isArray(remote.tools)) {
        return {
          tools: remote.tools as PrototypeToolSeed[],
          externalCatalogVersion: remote.externalCatalogVersion,
          internalCatalogVersion: remote.internalCatalogVersion,
          initialized: remote.initialized,
          initializedAt: remote.initializedAt,
          migratedAt: remote.migratedAt,
        };
      }
      if (options?.throwOnRemoteError) throw new Error('invalid_tools_payload');
    } catch (error) {
      if (options?.throwOnRemoteError) throw error;
      /* fall through to empty local catalog */
    }
  }
  return emptyToolCatalog();
}

/** 显式别名，调用方可读出这是全局工具目录而非 marketplace。 */
export const loadGlobalTools = loadTools;

export async function loadMarketplace(
  options?: { throwOnRemoteError?: boolean },
): Promise<MarketplaceSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchMarketplaceApi();
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
    } catch (error) {
      if (options?.throwOnRemoteError) throw error;
      /* fall through to local */
    }
  }
  return emptyMarketplace();
}

export async function saveMarketplace(
  snapshot: MarketplaceSnapshot | WorkspaceMarketplaceSnapshot,
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  if (!useWorkspaceStore.getState().apiConnected) {
    const result: MarketplaceSaveResult = { synced: false, reason: 'offline' };
    if (options?.reportFailure !== false) reportMarketplaceSync(result);
    return result;
  }
  try {
    await saveMarketplaceApi(snapshot);
    const result: MarketplaceSaveResult = { synced: true };
    reportMarketplaceSync(result);
    return result;
  } catch (err) {
    const result: MarketplaceSaveResult = {
      synced: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : undefined,
    };
    if (options?.reportFailure !== false) reportMarketplaceSync(result);
    return result;
  }
}

/** 将工具目录写入部署级共享 API。 */
export async function saveTools(
  snapshot: ToolCatalogSnapshot | PrototypeToolSeed[],
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  if (!useWorkspaceStore.getState().apiConnected) {
    const result: MarketplaceSaveResult = { synced: false, reason: 'offline' };
    if (options?.reportFailure !== false) reportMarketplaceSync(result);
    return result;
  }
  try {
    const payload: ToolCatalogSnapshot = Array.isArray(snapshot)
      ? { tools: snapshot }
      : snapshot;
    await saveToolsApi(payload);
    const result: MarketplaceSaveResult = { synced: true };
    reportMarketplaceSync(result);
    return result;
  } catch (err) {
    const result: MarketplaceSaveResult = {
      synced: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : undefined,
    };
    if (options?.reportFailure !== false) reportMarketplaceSync(result);
    return result;
  }
}

export const saveGlobalTools = saveTools;

function reportMarketplaceSync(result: MarketplaceSaveResult) {
  reportShareSync({
    kind: 'marketplace',
    synced: result.synced,
    reason: result.reason,
    detail: result.detail,
  });
}

function readLocalSessions(): Record<string, ChatConfig> | null {
  return memorySessions ? structuredClone(memorySessions) : null;
}

function writeLocalSessions(chats: Record<string, ChatConfig>) {
  memorySessions = structuredClone(chats);
}

/**
 * 平台会话对当前登录用户可见的子集：
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

export async function loadSessions(): Promise<Record<string, ChatConfig> | null> {
  let raw: Record<string, ChatConfig> | null = null;
  // 会话接口按登录人读写，游客只用本机副本
  if (useWorkspaceStore.getState().apiConnected && getCurrentUserId().trim()) {
    try {
      const remote = await fetchSessionsApi();
      if (remote && Object.keys(remote).length) raw = remote;
    } catch {
      /* fall through */
    }
  }
  if (!raw) raw = readLocalSessions();
  if (!raw) return null;
  const filtered = filterSessionsForCurrentUser(raw);
  writeLocalSessions(filtered);
  return filtered;
}

export async function saveSessions(
  chats: Record<string, ChatConfig>,
): Promise<MarketplaceSaveResult> {
  const owned = filterSessionsForCurrentUser(chats);
  writeLocalSessions(owned);
  if (!useWorkspaceStore.getState().apiConnected || !getCurrentUserId().trim()) {
    return { synced: false, reason: 'offline' };
  }
  try {
    let remote: Record<string, ChatConfig> = {};
    try {
      remote = (await fetchSessionsApi()) ?? {};
    } catch {
      remote = {};
    }
    const merged = mergeSessionsForPersist(remote, owned);
    await saveSessionsApi(merged);
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
const marketplaceSaveKey = 'marketplace';
let marketplaceSaveChain: Promise<MarketplaceSaveResult> | undefined;
const globalToolsSaveKey = 'global-tools';
let globalToolsSaveChain: Promise<MarketplaceSaveResult> | undefined;

function enqueueMarketplaceSave(
  snapshot: MarketplaceSnapshot | WorkspaceMarketplaceSnapshot,
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  const previous = marketplaceSaveChain;
  const next = previous
    ? previous.then(
        () => saveMarketplace(snapshot, options),
        () => saveMarketplace(snapshot, options),
      )
    : saveMarketplace(snapshot, options);
  marketplaceSaveChain = next;
  void next.then(
    () => {
      if (marketplaceSaveChain === next) marketplaceSaveChain = undefined;
    },
    () => {
      if (marketplaceSaveChain === next) marketplaceSaveChain = undefined;
    },
  );
  return next;
}

export function scheduleSaveMarketplace(
  snapshot: MarketplaceSnapshot | WorkspaceMarketplaceSnapshot,
  ms = 600,
) {
  const prev = debounceTimers.get(marketplaceSaveKey);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    marketplaceSaveKey,
    setTimeout(() => {
      debounceTimers.delete(marketplaceSaveKey);
      void enqueueMarketplaceSave(snapshot);
    }, ms),
  );
}

/**
 * Cancel the still-pending debounce and persist the supplied
 * full snapshot now. Already-started writes stay ordered ahead of this one, so
 * an older request cannot finish later and overwrite the confirmed save.
 */
export function flushSaveMarketplace(
  snapshot: MarketplaceSnapshot | WorkspaceMarketplaceSnapshot,
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  const pending = debounceTimers.get(marketplaceSaveKey);
  if (pending) {
    clearTimeout(pending);
    debounceTimers.delete(marketplaceSaveKey);
  }
  return enqueueMarketplaceSave(snapshot, options);
}

function enqueueGlobalToolsSave(
  snapshot: ToolCatalogSnapshot | PrototypeToolSeed[],
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  const previous = globalToolsSaveChain;
  const next = previous
    ? previous.then(
        () => saveTools(snapshot, options),
        () => saveTools(snapshot, options),
      )
    : saveTools(snapshot, options);
  globalToolsSaveChain = next;
  void next.then(
    () => {
      if (globalToolsSaveChain === next) globalToolsSaveChain = undefined;
    },
    () => {
      if (globalToolsSaveChain === next) globalToolsSaveChain = undefined;
    },
  );
  return next;
}

/** 防抖写入全局工具目录，单条队列保证先后顺序。 */
export function scheduleSaveTools(
  snapshot: ToolCatalogSnapshot | PrototypeToolSeed[],
  ms = 600,
  onResult?: (result: MarketplaceSaveResult) => void,
) {
  const prev = debounceTimers.get(globalToolsSaveKey);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    globalToolsSaveKey,
    setTimeout(() => {
      debounceTimers.delete(globalToolsSaveKey);
      void enqueueGlobalToolsSave(snapshot).then((result) => onResult?.(result));
    }, ms),
  );
}

export const scheduleSaveGlobalTools = scheduleSaveTools;

/** 取消待执行的全局工具防抖并立即写入，且等待已开始的全局写入。 */
export function flushSaveTools(
  snapshot: ToolCatalogSnapshot | PrototypeToolSeed[],
  options?: MarketplaceSaveOptions,
): Promise<MarketplaceSaveResult> {
  const pending = debounceTimers.get(globalToolsSaveKey);
  if (pending) {
    clearTimeout(pending);
    debounceTimers.delete(globalToolsSaveKey);
  }
  return enqueueGlobalToolsSave(snapshot, options);
}

export const flushSaveGlobalTools = flushSaveTools;

export function scheduleSaveSessions(chats: Record<string, ChatConfig>, ms = 600) {
  const key = 'sessions';
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void saveSessions(chats);
    }, ms),
  );
}
