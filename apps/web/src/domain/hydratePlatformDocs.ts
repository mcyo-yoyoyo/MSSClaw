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

  await hydrateAccountCredentials(ws);
  const members = await hydrateMembersFromServer(ws);
  const { useSettingsStore } = await import('@/stores/settingsStore');
  useSettingsStore.setState({ workspaceId: ws, members });

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
  const { useOrgTaxonomyStore } = await import('@/stores/orgTaxonomyStore');
  const { useMarketFeaturedStore } = await import('@/stores/marketFeaturedStore');
  const { useMarketFavoriteStore } = await import('@/stores/marketFavoriteStore');
  const { useRecentMarketStore } = await import('@/stores/recentMarketStore');
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
  useOrgTaxonomyStore.getState().hydrate();
  useMarketFeaturedStore.getState().hydrate();
  useMarketFavoriteStore.getState().hydrate();
  useRecentMarketStore.getState().hydrate();
  useContentEngagementStore.getState().hydrate();
  useAuditStore.getState().hydrate();
  useAiNewsPreferenceStore.getState().hydrate();
  useAiNewsStore.getState().hydrate();
  useAiBriefEmailCopyStore.getState().hydrate();
  useLlmConfigStore.getState().hydrate();
  useAssetApprovalStore.getState().hydrate();

  const { hydrateInboxMessages } = await import('@/domain/persistence/inboxStorage');
  const { useInboxStore } = await import('@/stores/inboxStore');
  const inbox = await hydrateInboxMessages(ws);
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
