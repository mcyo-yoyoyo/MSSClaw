/**
 * 平台 docs 启动灌入：成员 / 密码 / 运营配置等。
 * 各业务 store 在 hydrate() 内自行 fetchPlatformDoc，不再写 localStorage。
 */

import { canUsePlatformDocsApi, currentWorkspaceId } from '@/api/platformDocsApi';
import { hydrateAccountCredentials } from '@/domain/accountCredentials';
import { hydrateMembersFromServer } from '@/stores/settingsStore';

export async function hydrateAllPlatformDocs(workspaceId?: string): Promise<void> {
  const ws = workspaceId || currentWorkspaceId();
  if (!canUsePlatformDocsApi()) return;

  // 密码表只有 super_admin 能读（服务端 403）。非管理员不必发这一次请求，
  // 读不到也不影响登录——鉴权由 Nest /auth/login 负责。
  const { useSessionStore } = await import('@/stores/sessionStore');
  if (useSessionStore.getState().user?.platformRole === 'super_admin') {
    await hydrateAccountCredentials(ws);
  }
  const members = await hydrateMembersFromServer(ws);
  const { useSettingsStore } = await import('@/stores/settingsStore');
  // 工作区切换期间旧 hydrate 可能后返回；不能把成员面板切回旧空间。
  if (currentWorkspaceId() === ws) {
    useSettingsStore.setState({ workspaceId: ws, members });
  }

  const { useNavPresentationStore } = await import('@/stores/navPresentationStore');
  const { useWorkspaceConfigStore } = await import('@/stores/workspaceConfigStore');
  const { useStationAnnouncementStore } = await import('@/stores/stationAnnouncementStore');
  const { usePlazaToolGuideStore } = await import('@/stores/plazaToolGuideStore');
  const { useMssBuildStatsCopyStore } = await import('@/stores/mssBuildStatsCopyStore');
  const { useBusinessScenarioCatalogStore } = await import(
    '@/stores/businessScenarioCatalogStore'
  );
  const { useExternalTaxonomyCatalogStore } = await import(
    '@/stores/externalTaxonomyCatalogStore'
  );
  const { useInternalOfficeSceneCatalogStore } = await import(
    '@/stores/internalOfficeSceneCatalogStore'
  );
  const { useExternalToolLayoutStore } = await import('@/stores/externalToolLayoutStore');
  const { useOrgTaxonomyStore } = await import('@/stores/orgTaxonomyStore');
  const { useMarketFavoriteStore } = await import('@/stores/marketFavoriteStore');
  const { useRecentMarketStore } = await import('@/stores/recentMarketStore');
  const { useMarketHiddenStore } = await import('@/stores/marketHiddenStore');
  const { useContentEngagementStore } = await import('@/stores/contentEngagementStore');
  const { useAuditStore } = await import('@/stores/auditStore');
  const { useAiNewsPreferenceStore } = await import('@/stores/aiNewsPreferenceStore');
  const { useAiNewsStore } = await import('@/stores/aiNewsStore');
  const { useAiBriefEmailCopyStore } = await import('@/stores/aiBriefEmailCopyStore');
  const { useLlmConfigStore } = await import('@/stores/llmConfigStore');
  const { useAssetApprovalStore } = await import('@/stores/assetApprovalStore');

  useNavPresentationStore.getState().hydrate();
  useWorkspaceConfigStore.getState().hydrate();
  useStationAnnouncementStore.getState().hydrate();
  usePlazaToolGuideStore.getState().bootstrap(ws);
  useMssBuildStatsCopyStore.getState().hydrate();
  useBusinessScenarioCatalogStore.getState().hydrate();
  useExternalTaxonomyCatalogStore.getState().hydrate();
  useInternalOfficeSceneCatalogStore.getState().hydrate();
  useExternalToolLayoutStore.getState().hydrate(ws);
  useOrgTaxonomyStore.getState().hydrate();
  useMarketFavoriteStore.getState().hydrate();
  useRecentMarketStore.getState().hydrate();
  useMarketHiddenStore.getState().hydrate();
  useContentEngagementStore.getState().hydrate();
  useAuditStore.getState().hydrate();
  useAiNewsPreferenceStore.getState().hydrate();
  useAiNewsStore.getState().hydrate();
  useAiBriefEmailCopyStore.getState().hydrate();
  await useLlmConfigStore.getState().hydrate({ fresh: true });
  useAssetApprovalStore.getState().hydrate();

  const { hydrateInboxMessages } = await import('@/domain/persistence/inboxStorage');
  const { useInboxStore } = await import('@/stores/inboxStore');
  const { getCurrentUserId } = await import('@/domain/currentUser');
  const inbox = await hydrateInboxMessages(ws, getCurrentUserId());
  useInboxStore.setState({ messages: inbox });

  const { hydrateWarroomWebhookUrl } = await import('@/domain/webhookConfig');
  const { hydrateSecurityPolicy } = await import('@/domain/securityPolicy');
  const { hydrateDemoContentPolicy } = await import('@/domain/demoContentPolicy');
  await Promise.all([
    hydrateWarroomWebhookUrl(ws),
    hydrateSecurityPolicy(ws),
    hydrateDemoContentPolicy(ws),
  ]);
}
