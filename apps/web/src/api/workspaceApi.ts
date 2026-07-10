import {
  getWorkspaceCatalog,
  WORKSPACE_CATALOG,
  WORKSPACE_LIST,
  WorkspaceCatalogSchema,
  WorkspaceSchema,
  type Workspace,
  type WorkspaceCatalog,
} from '@/domain/workspace';
import { apiUrl, isApiEnabled } from '@/api/client';

export async function fetchWorkspaceList(): Promise<Workspace[]> {
  if (!isApiEnabled()) return WORKSPACE_LIST;

  try {
    const response = await fetch(apiUrl('/api/v1/workspaces'));
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
    const response = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/catalog`));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return WorkspaceCatalogSchema.parse(payload);
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
