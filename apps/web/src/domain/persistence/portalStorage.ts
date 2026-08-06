import { PORTAL_CONTENT_VERSION } from '@/domain/prototype/constants';
import { PROTOTYPE_PORTAL_CONTENT } from '@/domain/prototype/portalContent';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { RETIRED_DEMO_TOOL_IDS } from '@/domain/prototype/tools';
import {
  LS_PORTAL_CONTENT_VERSION,
  mergeCatalog,
  portalContentKeyForWorkspace,
} from '@/domain/persistence/keys';
import {
  fetchPortalContentApi,
  savePortalContentApi,
  PortalConflictError,
} from '@/api/persistenceApi';
import { externalizePortalItemAttachments } from '@/api/blobApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { demoDefaults } from '@/domain/demoContentPolicy';

const RETIRED_TOOL_IDS = new Set<string>(RETIRED_DEMO_TOOL_IDS);

function pruneRetiredPortalToolRefs(items: PortalContentItem[]): PortalContentItem[] {
  return items.map((item) => {
    if (!item.toolId || !RETIRED_TOOL_IDS.has(item.toolId)) return item;
    const { toolId: _removed, ...rest } = item;
    return rest;
  });
}

export interface PortalContentSnapshot {
  items: PortalContentItem[];
  revision?: number;
}

export type PortalSaveResult = {
  synced: boolean;
  error?: string;
  conflict?: boolean;
  items?: PortalContentItem[];
  revision?: number;
};

/** 各 workspace 当前已知的服务端 revision（乐观锁） */
const revisionByWorkspace = new Map<string, number>();

export function getPortalRevision(workspaceId: string): number {
  return revisionByWorkspace.get(workspaceId) ?? 0;
}

function setPortalRevision(workspaceId: string, revision: number) {
  revisionByWorkspace.set(workspaceId, revision);
}

function clearStalePortalContentCaches() {
  if (localStorage.getItem(LS_PORTAL_CONTENT_VERSION) === PORTAL_CONTENT_VERSION) return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('mssclaw_portal_content_')) localStorage.removeItem(key);
  }
  localStorage.setItem(LS_PORTAL_CONTENT_VERSION, PORTAL_CONTENT_VERSION);
}

function readLocalPortalContent(workspaceId: string): PortalContentSnapshot {
  clearStalePortalContentCaches();

  try {
    const raw = localStorage.getItem(portalContentKeyForWorkspace(workspaceId));
    const saved = raw ? (JSON.parse(raw) as PortalContentItem[] | null) : null;
    const defaults = demoDefaults(PROTOTYPE_PORTAL_CONTENT);
    return {
      items: pruneRetiredPortalToolRefs(mergeCatalog(defaults, saved)),
      revision: getPortalRevision(workspaceId),
    };
  } catch {
    return {
      items: pruneRetiredPortalToolRefs(
        structuredClone(demoDefaults(PROTOTYPE_PORTAL_CONTENT)),
      ),
      revision: getPortalRevision(workspaceId),
    };
  }
}

function writeLocalPortalContent(workspaceId: string, snapshot: PortalContentSnapshot) {
  try {
    localStorage.setItem(
      portalContentKeyForWorkspace(workspaceId),
      JSON.stringify(snapshot.items),
    );
    localStorage.setItem(LS_PORTAL_CONTENT_VERSION, PORTAL_CONTENT_VERSION);
  } catch (err) {
    console.warn('[portal] localStorage write failed (quota?):', err);
  }
}

export async function loadPortalContent(workspaceId: string): Promise<PortalContentSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchPortalContentApi(workspaceId);
      if (remote?.items) {
        const revision = remote.revision ?? 0;
        setPortalRevision(workspaceId, revision);
        const merged = pruneRetiredPortalToolRefs(
          mergeCatalog(demoDefaults(PROTOTYPE_PORTAL_CONTENT), remote.items),
        );
        writeLocalPortalContent(workspaceId, { items: merged, revision });
        return { items: merged, revision };
      }
    } catch {
      /* fall through to local cache */
    }
  }
  return readLocalPortalContent(workspaceId);
}

export async function savePortalContent(
  workspaceId: string,
  snapshot: PortalContentSnapshot,
): Promise<PortalSaveResult> {
  let items = snapshot.items;
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      items = await externalizePortalItemAttachments(workspaceId, snapshot.items);
    } catch (err) {
      console.warn('[portal] blob externalize failed:', err);
    }
  }
  const next: PortalContentSnapshot = {
    items,
    revision: getPortalRevision(workspaceId),
  };
  writeLocalPortalContent(workspaceId, next);
  if (!useWorkspaceStore.getState().apiConnected) {
    return { synced: false, error: 'api_offline', items };
  }
  try {
    const saved = await savePortalContentApi(workspaceId, {
      items,
      expectedRevision: getPortalRevision(workspaceId),
    });
    if (typeof saved.revision === 'number') {
      setPortalRevision(workspaceId, saved.revision);
    }
    writeLocalPortalContent(workspaceId, {
      items: saved.items ?? items,
      revision: getPortalRevision(workspaceId),
    });
    return {
      synced: true,
      items: saved.items ?? items,
      revision: getPortalRevision(workspaceId),
    };
  } catch (err) {
    if (err instanceof PortalConflictError) {
      try {
        const remote = await fetchPortalContentApi(workspaceId);
        if (remote?.items) {
          const revision = remote.revision ?? err.revision ?? getPortalRevision(workspaceId);
          setPortalRevision(workspaceId, revision);
          const merged = pruneRetiredPortalToolRefs(
          mergeCatalog(demoDefaults(PROTOTYPE_PORTAL_CONTENT), remote.items),
        );
          writeLocalPortalContent(workspaceId, { items: merged, revision });
          return {
            synced: false,
            conflict: true,
            error: 'conflict',
            items: merged,
            revision,
          };
        }
      } catch {
        /* ignore reload failure */
      }
      return { synced: false, conflict: true, error: 'conflict', items };
    }
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'save_failed',
      items,
    };
  }
}

type QueuedSave = {
  workspaceId: string;
  snapshot: PortalContentSnapshot;
};

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const queuedByKey = new Map<string, QueuedSave>();
const inFlightKeys = new Set<string>();

export type SchedulePortalSaveOptions = {
  /** 外提/冲突后把权威 items 写回 Zustand，避免内存残留 dataUrl */
  onApplied?: (items: PortalContentItem[], meta: { conflict?: boolean }) => void;
};

/**
 * 防抖 + 串行：同一 workspace 同时只跑一个 save；
 * 飞行中若有新快照，结束后再刷一次最新队列。
 */
export function scheduleSavePortalContent(
  workspaceId: string,
  snapshot: PortalContentSnapshot,
  ms = 600,
  options?: SchedulePortalSaveOptions,
) {
  const key = `portal:${workspaceId}`;
  queuedByKey.set(key, { workspaceId, snapshot: { items: snapshot.items } });
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void flushPortalSave(key, options);
    }, ms),
  );
}

async function flushPortalSave(key: string, options?: SchedulePortalSaveOptions) {
  if (inFlightKeys.has(key)) return;
  const job = queuedByKey.get(key);
  if (!job) return;
  queuedByKey.delete(key);
  inFlightKeys.add(key);
  try {
    const result = await savePortalContent(job.workspaceId, job.snapshot);
    if (result.items) {
      options?.onApplied?.(result.items, { conflict: result.conflict });
    }
    if (result.conflict) {
      console.warn('[portal] conflict: reloaded server copy');
    } else if (!result.synced && result.error && result.error !== 'api_offline') {
      console.warn('[portal] shared API sync failed:', result.error);
    }
  } finally {
    inFlightKeys.delete(key);
    if (queuedByKey.has(key)) {
      void flushPortalSave(key, options);
    }
  }
}
