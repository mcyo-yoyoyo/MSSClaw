import { useMemo } from 'react';
import { ToastHost } from '@/components/common/ToastHost';
import { useConversationStore } from '@/stores/conversationStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { usePromptStore } from '@/stores/promptStore';
import { usePortalContentStore } from '@/stores/portalContentStore';

/** Isolated toast subscriptions — prevents App shell re-renders on toast updates */
export function GlobalToastHost() {
  const pushToast = useConversationStore((s) => s.pushToast);
  const dismissToast = useConversationStore((s) => s.dismissToast);
  const switchToast = useWorkspaceStore((s) => s.switchToast);
  const dismissSwitchToast = useWorkspaceStore((s) => s.dismissSwitchToast);
  const settingsToast = useSettingsStore((s) => s.toast);
  const dismissSettingsToast = useSettingsStore((s) => s.dismissToast);
  const marketToast = useMarketplaceStore((s) => s.toast);
  const dismissMarketToast = useMarketplaceStore((s) => s.dismissToast);
  const workflowToast = useWorkflowStore((s) => s.toast);
  const dismissWorkflowToast = useWorkflowStore((s) => s.dismissToast);
  const memoryToast = useMemoryStore((s) => s.toast);
  const dismissMemoryToast = useMemoryStore((s) => s.dismissToast);
  const promptToast = usePromptStore((s) => s.toast);
  const dismissPromptToast = usePromptStore((s) => s.dismissToast);
  const portalToast = usePortalContentStore((s) => s.toast);
  const dismissPortalToast = usePortalContentStore((s) => s.dismissToast);

  const sources = useMemo(
    () => [
      { key: 'conv', message: pushToast, dismiss: dismissToast },
      { key: 'switch', message: switchToast, dismiss: dismissSwitchToast },
      { key: 'settings', message: settingsToast, dismiss: dismissSettingsToast },
      { key: 'market', message: marketToast, dismiss: dismissMarketToast },
      { key: 'workflow', message: workflowToast, dismiss: dismissWorkflowToast },
      { key: 'memory', message: memoryToast, dismiss: dismissMemoryToast },
      { key: 'prompt', message: promptToast, dismiss: dismissPromptToast },
      { key: 'portal', message: portalToast, dismiss: dismissPortalToast },
    ],
    [
      pushToast,
      switchToast,
      settingsToast,
      marketToast,
      workflowToast,
      memoryToast,
      promptToast,
      portalToast,
      dismissToast,
      dismissSwitchToast,
      dismissSettingsToast,
      dismissMarketToast,
      dismissWorkflowToast,
      dismissMemoryToast,
      dismissPromptToast,
      dismissPortalToast,
    ],
  );

  return <ToastHost sources={sources} />;
}
