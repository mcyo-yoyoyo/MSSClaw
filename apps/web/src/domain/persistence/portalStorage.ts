import { PORTAL_CONTENT_VERSION } from '@/domain/prototype/constants';
import { PROTOTYPE_PORTAL_CONTENT } from '@/domain/prototype/portalContent';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import {
  LS_PORTAL_CONTENT_VERSION,
  mergeCatalog,
  portalContentKeyForWorkspace,
} from '@/domain/persistence/keys';
import {
  fetchPortalContentApi,
  savePortalContentApi,
} from '@/api/persistenceApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { demoDefaults } from '@/domain/demoContentPolicy';

export interface PortalContentSnapshot {
  items: PortalContentItem[];
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
    return { items: mergeCatalog(defaults, saved) };
  } catch {
    return { items: structuredClone(demoDefaults(PROTOTYPE_PORTAL_CONTENT)) };
  }
}

function writeLocalPortalContent(workspaceId: string, snapshot: PortalContentSnapshot) {
  localStorage.setItem(portalContentKeyForWorkspace(workspaceId), JSON.stringify(snapshot.items));
  localStorage.setItem(LS_PORTAL_CONTENT_VERSION, PORTAL_CONTENT_VERSION);
}

export async function loadPortalContent(workspaceId: string): Promise<PortalContentSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchPortalContentApi(workspaceId);
      if (remote?.items) {
        // 共享 API 为权威源：远端用户上传（含附件 dataUrl）优先，再补演示种子缺项
        const merged = mergeCatalog(demoDefaults(PROTOTYPE_PORTAL_CONTENT), remote.items);
        writeLocalPortalContent(workspaceId, { items: merged });
        return { items: merged };
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
): Promise<{ synced: boolean; error?: string }> {
  writeLocalPortalContent(workspaceId, snapshot);
  if (!useWorkspaceStore.getState().apiConnected) {
    return { synced: false, error: 'api_offline' };
  }
  try {
    await savePortalContentApi(workspaceId, snapshot);
    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'save_failed',
    };
  }
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSavePortalContent(
  workspaceId: string,
  snapshot: PortalContentSnapshot,
  ms = 600,
) {
  const key = `portal:${workspaceId}`;
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void savePortalContent(workspaceId, snapshot).then((result) => {
        if (result.synced) return;
        if (result.error && result.error !== 'api_offline') {
          useWorkspaceStore.getState(); // keep import live
          // 同步失败时写控制台，避免静默丢附件
          console.warn('[portal] shared API sync failed:', result.error);
        }
      });
    }, ms),
  );
}
