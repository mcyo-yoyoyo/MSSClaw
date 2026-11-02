import { WorkspaceCatalogSchema, type WorkspaceCatalog } from '@/domain/workspace';
import { apiUrl, fetchWithTimeout } from '@/api/client';

/** 平台目录（资源树、对话列表）。失败时抛出，由调用方进入空目录，不用演示数据顶上。 */
export async function fetchPlatformCatalog(): Promise<WorkspaceCatalog> {
  const response = await fetchWithTimeout(apiUrl('/api/v1/catalog'), {}, 8000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return WorkspaceCatalogSchema.parse(await response.json());
}
