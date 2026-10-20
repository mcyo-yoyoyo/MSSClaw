import { PLATFORM_CATALOG, WorkspaceCatalogSchema, type WorkspaceCatalog } from '@/domain/workspace';
import { apiUrl, isApiEnabled, fetchWithTimeout } from '@/api/client';

/** 平台目录（资源树、对话列表）；接口不可用或返回空目录时用前端种子。 */
export async function fetchPlatformCatalog(): Promise<WorkspaceCatalog> {
  if (!isApiEnabled()) return PLATFORM_CATALOG;

  try {
    const response = await fetchWithTimeout(apiUrl('/api/v1/catalog'), {}, 8000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = WorkspaceCatalogSchema.parse(await response.json());
    const remoteEmpty =
      Object.keys(parsed.chats ?? {}).length === 0 && (parsed.resources?.length ?? 0) === 0;
    // 服务端首次自动建出的空目录不能覆盖前端种子，否则登录后会话水合会把工作台打崩
    return remoteEmpty ? PLATFORM_CATALOG : parsed;
  } catch {
    return PLATFORM_CATALOG;
  }
}
