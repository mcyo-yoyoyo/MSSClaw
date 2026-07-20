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
    return { items: mergeCatalog(PROTOTYPE_PORTAL_CONTENT, saved) };
  } catch {
    return { items: structuredClone(PROTOTYPE_PORTAL_CONTENT) };
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
        return { items: mergeCatalog(PROTOTYPE_PORTAL_CONTENT, remote.items) };
      }
    } catch {
      /* fall through */
    }
  }
  return readLocalPortalContent(workspaceId);
}

export async function savePortalContent(
  workspaceId: string,
  snapshot: PortalContentSnapshot,
): Promise<void> {
  writeLocalPortalContent(workspaceId, snapshot);
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      await savePortalContentApi(workspaceId, snapshot);
    } catch {
      /* local already saved */
    }
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
      void savePortalContent(workspaceId, snapshot);
    }, ms),
  );
}
