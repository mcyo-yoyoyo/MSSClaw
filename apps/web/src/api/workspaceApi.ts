import {
  getWorkspaceCatalog,
  WORKSPACE_CATALOG,
  WORKSPACE_LIST,
  WorkspaceCatalogSchema,
  WorkspaceSchema,
  type Workspace,
  type WorkspaceCatalog,
} from '@/domain/workspace';
import { apiUrl, isApiEnabled, fetchWithTimeout } from '@/api/client';

export async function fetchWorkspaceList(): Promise<Workspace[]> {
  if (!isApiEnabled()) return WORKSPACE_LIST;

  try {
    const response = await fetchWithTimeout(apiUrl('/api/v1/workspaces'), {}, 8000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return zodParseWorkspaceList(payload.workspaces);
  } catch {
    return WORKSPACE_LIST;
  }
}

export async function fetchWorkspaceCatalog(workspaceId: string): Promise<WorkspaceCatalog> {
  if (!isApiEnabled()) return getWorkspaceCatalog(workspaceId);

  try {
    const response = await fetchWithTimeout(
      apiUrl(`/api/v1/workspaces/${workspaceId}/catalog`),
      {},
      8000,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const parsed = WorkspaceCatalogSchema.parse(payload);
    const local = getWorkspaceCatalog(workspaceId);
    const remoteEmpty =
      Object.keys(parsed.chats ?? {}).length === 0 &&
      (parsed.resources?.length ?? 0) === 0;
    const localRicher =
      Object.keys(local.chats ?? {}).length > 0 || (local.resources?.length ?? 0) > 0;
    // 自动建租户的空 catalog 不能覆盖前端种子，否则登录后会话水合会把工作台打崩
    if (remoteEmpty && localRicher) return local;
    return parsed;
  } catch {
    return getWorkspaceCatalog(workspaceId);
  }
}

export async function fetchAllWorkspaceCatalogs(workspaceIds: string[]) {
  const entries = await Promise.all(
    workspaceIds.map(async (id) => [id, await fetchWorkspaceCatalog(id)] as const),
  );
  return Object.fromEntries(entries) as Record<string, WorkspaceCatalog>;
}

export function getLocalWorkspaceCatalogs() {
  return WORKSPACE_CATALOG;
}

function zodParseWorkspaceList(rows: unknown): Workspace[] {
  if (!Array.isArray(rows)) return WORKSPACE_LIST;
  const parsed = rows
    .map((row) => {
      try {
        return WorkspaceSchema.parse(row);
      } catch {
        return null;
      }
    })
    .filter((row): row is Workspace => row !== null);
  return parsed.length > 0 ? parsed : WORKSPACE_LIST;
}
