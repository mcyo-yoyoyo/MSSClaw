import { PROTOTYPE_PORTAL_CONTENT } from '@/domain/prototype/portalContent';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { RETIRED_DEMO_TOOL_IDS } from '@/domain/prototype/tools';
import { mergeCatalog } from '@/domain/persistence/keys';
import {
  fetchPortalContentApi,
  savePortalContentApi,
  PortalConflictError,
} from '@/api/persistenceApi';
import { externalizePortalItemAttachments } from '@/api/blobApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { demoDefaults } from '@/domain/demoContentPolicy';
import { reportShareSync } from '@/domain/shareSync';

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

/** 当前已知的服务端 revision（乐观锁） */
let portalRevision = 0;
/** 内存态：禁止写入 localStorage */
let memoryPortal: PortalContentSnapshot | null = null;

export function getPortalRevision(): number {
  return portalRevision;
}

function setPortalRevision(revision: number) {
  portalRevision = revision;
}

function readLocalPortalContent(): PortalContentSnapshot {
  const cached = memoryPortal;
  if (cached) {
    return {
      items: pruneRetiredPortalToolRefs(structuredClone(cached.items)),
      revision: cached.revision ?? getPortalRevision(),
    };
  }
  return {
    items: pruneRetiredPortalToolRefs(
      structuredClone(demoDefaults(PROTOTYPE_PORTAL_CONTENT)),
    ),
    revision: getPortalRevision(),
  };
}

function writeLocalPortalContent(snapshot: PortalContentSnapshot) {
  memoryPortal = {
    items: structuredClone(snapshot.items),
    revision: snapshot.revision,
  };
}

export async function loadPortalContent(): Promise<PortalContentSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchPortalContentApi();
      if (remote?.items) {
        const revision = remote.revision ?? 0;
        setPortalRevision(revision);
        const merged = pruneRetiredPortalToolRefs(
          mergeCatalog(demoDefaults(PROTOTYPE_PORTAL_CONTENT), remote.items),
        );
        writeLocalPortalContent({ items: merged, revision });
        return { items: merged, revision };
      }
    } catch {
      /* fall through to local cache */
    }
  }
  return readLocalPortalContent();
}

export async function savePortalContent(
  snapshot: PortalContentSnapshot,
): Promise<PortalSaveResult> {
  let items = snapshot.items;
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      items = await externalizePortalItemAttachments(snapshot.items);
    } catch (err) {
      console.warn('[portal] blob externalize failed:', err);
    }
  }
  const next: PortalContentSnapshot = {
    items,
    revision: getPortalRevision(),
  };
  writeLocalPortalContent(next);
  if (!useWorkspaceStore.getState().apiConnected) {
    reportShareSync({ kind: 'portal', synced: false, reason: 'offline' });
    return { synced: false, error: 'api_offline', items };
  }
  try {
    const saved = await savePortalContentApi({
      items,
      expectedRevision: getPortalRevision(),
    });
    if (typeof saved.revision === 'number') {
      setPortalRevision(saved.revision);
    }
    writeLocalPortalContent({
      items: saved.items ?? items,
      revision: getPortalRevision(),
    });
    reportShareSync({ kind: 'portal', synced: true });
    return {
      synced: true,
      items: saved.items ?? items,
      revision: getPortalRevision(),
    };
  } catch (err) {
    if (err instanceof PortalConflictError) {
      try {
        const remote = await fetchPortalContentApi();
        if (remote?.items) {
          const revision = remote.revision ?? err.revision ?? getPortalRevision();
          setPortalRevision(revision);
          const merged = pruneRetiredPortalToolRefs(
          mergeCatalog(demoDefaults(PROTOTYPE_PORTAL_CONTENT), remote.items),
        );
          writeLocalPortalContent({ items: merged, revision });
          reportShareSync({ kind: 'portal', synced: false, reason: 'conflict' });
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
      reportShareSync({ kind: 'portal', synced: false, reason: 'conflict' });
      return { synced: false, conflict: true, error: 'conflict', items };
    }
    reportShareSync({
      kind: 'portal',
      synced: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : undefined,
    });
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'save_failed',
      items,
    };
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let queued: PortalContentSnapshot | null = null;
let inFlight = false;

export type SchedulePortalSaveOptions = {
  /** 外提/冲突后把权威 items 写回 Zustand，避免内存残留 dataUrl */
  onApplied?: (items: PortalContentItem[], meta: { conflict?: boolean }) => void;
};

/**
 * 防抖 + 串行：同时只跑一个 save；
 * 飞行中若有新快照，结束后再刷一次最新队列。
 */
export function scheduleSavePortalContent(
  snapshot: PortalContentSnapshot,
  ms = 600,
  options?: SchedulePortalSaveOptions,
) {
  queued = { items: snapshot.items };
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void flushPortalSave(options);
  }, ms);
}

async function flushPortalSave(options?: SchedulePortalSaveOptions) {
  if (inFlight || !queued) return;
  const snapshot = queued;
  queued = null;
  inFlight = true;
  try {
    const result = await savePortalContent(snapshot);
    if (result.items) {
      options?.onApplied?.(result.items, { conflict: result.conflict });
    }
    if (result.conflict) {
      console.warn('[portal] conflict: reloaded server copy');
    } else if (!result.synced && result.error && result.error !== 'api_offline') {
      console.warn('[portal] shared API sync failed:', result.error);
    }
  } finally {
    inFlight = false;
    if (queued) void flushPortalSave(options);
  }
}
