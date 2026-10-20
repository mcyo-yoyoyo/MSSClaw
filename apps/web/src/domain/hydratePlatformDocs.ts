/**
 * 平台 docs 启动灌入：成员 / 密码 / 运营配置等。
 * 各业务 store 在 hydrate() 内自行 fetchPlatformDoc，不再写 localStorage。
 */

import { canUsePlatformDocsApi } from '@/api/platformDocsApi';
import { hydrateAccountCredentials } from '@/domain/accountCredentials';
import { hydrateMembersFromServer } from '@/stores/settingsStore';

export async function hydrateAllPlatformDocs(): Promise<void> {
  if (!canUsePlatformDocsApi()) return;

  // 密码表只有 super_admin 能读（服务端 403）。非管理员不必发这一次请求，
  // 读不到也不影响登录——鉴权由 Nest /auth/login 负责。
  const { useSessionStore } = await import('@/stores/sessionStore');
  const isAuthenticated = useSessionStore.getState().isAuthenticated;
  if (useSessionStore.getState().user?.platformRole === 'super_admin') {
    await hydrateAccountCredentials();
  }
  const members = await hydrateMembersFromServer();
  const { useSettingsStore } = await import('@/stores/settingsStore');
  useSettingsStore.setState({ members });

  const { useNavPresentationStore } = await import('@/stores/navPresentationStore');
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
  useStationAnnouncementStore.getState().hydrate();
  usePlazaToolGuideStore.getState().bootstrap();
  useMssBuildStatsCopyStore.getState().hydrate();
  useBusinessScenarioCatalogStore.getState().hydrate();
  useExternalTaxonomyCatalogStore.getState().hydrate();
  useInternalOfficeSceneCatalogStore.getState().hydrate();
  useExternalToolLayoutStore.getState().hydrate();
  useOrgTaxonomyStore.getState().hydrate();
  useMarketFavoriteStore.getState().hydrate();
  useRecentMarketStore.getState().hydrate();
  useMarketHiddenStore.getState().hydrate();
  useContentEngagementStore.getState().hydrate();
  useAuditStore.getState().hydrate();
  useAiNewsPreferenceStore.getState().hydrate();
  useAiNewsStore.getState().hydrate();
  useAiBriefEmailCopyStore.getState().hydrate();
  // llm-config contains real provider credentials and is member-only. A guest
  // bootstrap must not turn that expected 401 into a failed all-docs hydrate.
  if (isAuthenticated) {
    await useLlmConfigStore.getState().hydrate({ fresh: true });
  }
  useAssetApprovalStore.getState().hydrate();

  const { hydrateInboxMessages } = await import('@/domain/persistence/inboxStorage');
  const { useInboxStore } = await import('@/stores/inboxStore');
  const { getCurrentUserId } = await import('@/domain/currentUser');
  const inbox = await hydrateInboxMessages(getCurrentUserId());
  useInboxStore.setState({ messages: inbox.messages });

  const { hydrateWarroomWebhookUrl } = await import('@/domain/webhookConfig');
  const { hydrateSecurityPolicy } = await import('@/domain/securityPolicy');
  const { hydrateDemoContentPolicy } = await import('@/domain/demoContentPolicy');
  await Promise.all([
    hydrateWarroomWebhookUrl(),
    hydrateSecurityPolicy(),
    hydrateDemoContentPolicy(),
  ]);
}
