import { Suspense } from 'react';
import type { ReactNode } from 'react';
import type { AppView } from '@/domain/appView';
import { isAppViewPlaceholder } from '@/domain/appView';
import type { PrototypeAgentSeed, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';
import { HomePage } from '@/features/home/HomePage';
import { AppViewPlaceholder } from '@/components/shell/AppViewPlaceholder';
import { ViewLoadingFallback } from '@/components/common/ViewLoadingFallback';
import {
  LazyAgentCenterPage,
  LazyAgentStudioPage,
  LazyAutomationCenterPage,
  LazyKnowledgeCenterPage,
  LazyMemoryCenterPage,
  LazyPresentationConfigPage,
  LazyWorkspaceConfigPage,
  LazyPromptCenterPage,
  LazySettingsPage,
  LazySkillCenterPage,
  LazyTaskCenterPage,
  LazyToolCenterPage,
  LazyWorkflowStudioPage,
} from '@/features/lazyPages';

export interface AppViewRouterHandlers {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument: (doc: PrototypeKbDocument) => void;
  onRunAutomation: (automationId: string, agentId: string, name: string) => void;
  onOpenTaskChat?: (chatId: string) => void;
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

interface AppViewRouterProps {
  appView: AppView;
  handlers: AppViewRouterHandlers;
}

const VIEW_LABELS: Partial<Record<AppView, string>> = {
  task: '任务中心',
  agents: 'Agent 中心',
  'agent-studio': 'Agent Studio',
  skills: 'Skill 中心',
  kb: '知识库',
  automation: '自动化编排',
  workflow: 'Workflow 画布',
  tools: 'Tool 中心',
  memory: 'Memory 中心',
  prompts: 'Prompt 中心',
  admin: '权限管理',
  presentation: '展示配置',
  'workspace-config': '租户配置',
};

function LazyView({ label, children }: { label: string; children: ReactNode }) {
  return <Suspense fallback={<ViewLoadingFallback label={`正在打开${label}…`} />}>{children}</Suspense>;
}

export function AppViewRouter({ appView, handlers }: AppViewRouterProps) {
  if (appView === 'home') {
    return (
      <HomePage
        onSubmitTask={handlers.onSubmitTask}
        onInvokeAgent={handlers.onInvokeAgent}
        onInvokeSkill={handlers.onInvokeSkill}
      />
    );
  }

  if (isAppViewPlaceholder(appView)) {
    return <AppViewPlaceholder view={appView} />;
  }

  const label = VIEW_LABELS[appView] ?? '页面';

  switch (appView) {
    case 'task':
      return (
        <LazyView label={label}>
          <LazyTaskCenterPage onWorkspaceSwitch={handlers.onWorkspaceSwitch} />
        </LazyView>
      );
    case 'agents':
      return (
        <LazyView label={label}>
          <LazyAgentCenterPage onInvoke={handlers.onInvokeAgent} />
        </LazyView>
      );
    case 'agent-studio':
      return (
        <LazyView label={label}>
          <LazyAgentStudioPage onOpenChat={handlers.onOpenTaskChat} />
        </LazyView>
      );
    case 'skills':
      return (
        <LazyView label={label}>
          <LazySkillCenterPage onInvoke={handlers.onInvokeSkill} />
        </LazyView>
      );
    case 'kb':
      return (
        <LazyView label={label}>
          <LazyKnowledgeCenterPage onAskDocument={handlers.onAskKbDocument} />
        </LazyView>
      );
    case 'automation':
      return (
        <LazyView label={label}>
          <LazyAutomationCenterPage onRun={handlers.onRunAutomation} />
        </LazyView>
      );
    case 'workflow':
      return (
        <LazyView label={label}>
          <LazyWorkflowStudioPage />
        </LazyView>
      );
    case 'tools':
      return (
        <LazyView label={label}>
          <LazyToolCenterPage />
        </LazyView>
      );
    case 'memory':
      return (
        <LazyView label={label}>
          <LazyMemoryCenterPage />
        </LazyView>
      );
    case 'prompts':
      return (
        <LazyView label={label}>
          <LazyPromptCenterPage />
        </LazyView>
      );
    case 'admin':
      return (
        <LazyView label={label}>
          <LazySettingsPage />
        </LazyView>
      );
    case 'presentation':
      return (
        <LazyView label={label}>
          <LazyPresentationConfigPage />
        </LazyView>
      );
    case 'workspace-config':
      return (
        <LazyView label={label}>
          <LazyWorkspaceConfigPage />
        </LazyView>
      );
    default:
      return (
        <HomePage
          onSubmitTask={handlers.onSubmitTask}
          onInvokeAgent={handlers.onInvokeAgent}
          onInvokeSkill={handlers.onInvokeSkill}
        />
      );
  }
}
