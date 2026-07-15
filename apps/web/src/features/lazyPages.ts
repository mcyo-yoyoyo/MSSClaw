import { lazy } from 'react';
import type { AppView } from '@/domain/appView';

export const LazyTaskCenterPage = lazy(() =>
  import('@/features/task/TaskCenterPage').then((m) => ({ default: m.TaskCenterPage })),
);

export const LazyAgentCenterPage = lazy(() =>
  import('@/features/agent/AgentCenterPage').then((m) => ({ default: m.AgentCenterPage })),
);

export const LazySkillCenterPage = lazy(() =>
  import('@/features/skill/SkillCenterPage').then((m) => ({ default: m.SkillCenterPage })),
);

export const LazyAiMapPage = lazy(() =>
  import('@/features/ai-map/AiMapPage').then((m) => ({ default: m.AiMapPage })),
);

export const LazyKnowledgeCenterPage = lazy(() =>
  import('@/features/knowledge/KnowledgeCenterPage').then((m) => ({ default: m.KnowledgeCenterPage })),
);

export const LazyCaseLibraryPage = lazy(() =>
  import('@/features/cases/CaseLibraryPage').then((m) => ({ default: m.CaseLibraryPage })),
);

export const LazyAutomationCenterPage = lazy(() =>
  import('@/features/automation/AutomationCenterPage').then((m) => ({ default: m.AutomationCenterPage })),
);

export const LazyAgentStudioPage = lazy(() =>
  import('@/features/_legacy/agent/AgentStudioPage').then((m) => ({ default: m.AgentStudioPage })),
);

export const LazyWorkflowStudioPage = lazy(() =>
  import('@/features/_legacy/workflow/WorkflowStudioPage').then((m) => ({ default: m.WorkflowStudioPage })),
);

export const LazyToolCenterPage = lazy(() =>
  import('@/features/tool/ToolCenterPage').then((m) => ({ default: m.ToolCenterPage })),
);

export const LazyMemoryCenterPage = lazy(() =>
  import('@/features/_legacy/memory/MemoryCenterPage').then((m) => ({ default: m.MemoryCenterPage })),
);

export const LazyPromptCenterPage = lazy(() =>
  import('@/features/_legacy/prompt/PromptCenterPage').then((m) => ({ default: m.PromptCenterPage })),
);

export const LazySettingsPage = lazy(() =>
  import('@/features/_legacy/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

export const LazyPresentationConfigPage = lazy(() =>
  import('@/features/presentation/PresentationConfigPage').then((m) => ({ default: m.PresentationConfigPage })),
);

export const LazyWorkspaceConfigPage = lazy(() =>
  import('@/features/workspace/WorkspaceConfigPage').then((m) => ({ default: m.WorkspaceConfigPage })),
);

export const LazyPortalContentOpsPage = lazy(() =>
  import('@/features/ops/PortalContentOpsPage').then((m) => ({ default: m.PortalContentOpsPage })),
);

export const LazyCommandPalette = lazy(() =>
  import('@/components/shell/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);

export const LazySettingsDrawer = lazy(() =>
  import('@/components/shell/SettingsDrawer').then((m) => ({ default: m.SettingsDrawer })),
);

export const LazyExportModal = lazy(() =>
  import('@/components/common/ExportModal').then((m) => ({ default: m.ExportModal })),
);

/** Hover prefetch for secondary routes (dev + prod dynamic import cache) */
export const ROUTE_PREFETCH: Partial<Record<AppView, () => void>> = {
  task: () => void import('@/features/task/TaskCenterPage'),
  agents: () => void import('@/features/agent/AgentCenterPage'),
  'agent-studio': () => void import('@/features/_legacy/agent/AgentStudioPage'),
  skills: () => void import('@/features/skill/SkillCenterPage'),
  'ai-map': () => void import('@/features/ai-map/AiMapPage'),
  kb: () => void import('@/features/knowledge/KnowledgeCenterPage'),
  cases: () => void import('@/features/cases/CaseLibraryPage'),
  automation: () => void import('@/features/automation/AutomationCenterPage'),
  workflow: () => void import('@/features/_legacy/workflow/WorkflowStudioPage'),
  tools: () => void import('@/features/tool/ToolCenterPage'),
  memory: () => void import('@/features/_legacy/memory/MemoryCenterPage'),
  prompts: () => void import('@/features/_legacy/prompt/PromptCenterPage'),
  admin: () => void import('@/features/_legacy/settings/SettingsPage'),
  presentation: () => void import('@/features/presentation/PresentationConfigPage'),
  'workspace-config': () => void import('@/features/workspace/WorkspaceConfigPage'),
  'portal-ops': () => void import('@/features/ops/PortalContentOpsPage'),
};
