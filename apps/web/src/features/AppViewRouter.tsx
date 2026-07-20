import { Suspense } from 'react';
import type { ReactNode } from 'react';
import type { AppView } from '@/domain/appView';
import { isAppViewPlaceholder } from '@/domain/appView';
import type { PrototypeAgentSeed, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { HomePage } from '@/features/home/HomePage';
import { AppViewPlaceholder } from '@/components/shell/AppViewPlaceholder';
import { ViewLoadingFallback } from '@/components/common/ViewLoadingFallback';
import {
  LazyAgentCenterPage,
  LazyAiMapPage,
  LazyAutomationCenterPage,
  LazyKnowledgeCenterPage,
  LazyMemoryCenterPage,
  LazyPresentationConfigPage,
  LazyPortalContentOpsPage,
  LazyWorkspaceConfigPage,
  LazyPromptCenterPage,
  LazySettingsPage,
  LazySkillCenterPage,
  LazyTaskCenterPage,
  LazyMyMessagesPage,
  LazyToolCenterPage,
  LazyWorkflowStudioPage,
} from '@/features/lazyPages';

export interface AppViewRouterHandlers {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument: (doc: PrototypeKbDocument) => void;
  onRunAutomation: (automationId: string, agentId: string, name: string) => void;
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
  onOpenTaskChat?: (chatId: string) => void;
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

interface AppViewRouterProps {
  appView: AppView;
  handlers: AppViewRouterHandlers;
}

const VIEW_LABELS: Partial<Record<AppView, string>> = {
  task: '任务',
  messages: '我的消息',
  'ai-map': '案例',
  agents: '专家',
  'agent-studio': '专家',
  skills: '技能',
  kb: '知识',
  cases: '案例',
  automation: '自动化',
  workflow: '工作流',
  tools: '工具',
  memory: '记忆',
  prompts: '提示词',
  admin: '组织权限',
  presentation: '展示配置',
  'workspace-config': '租户配置',
  'portal-ops': '门户运营',
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
        onAskKbDocument={handlers.onAskKbDocument}
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
    case 'messages':
      return (
        <LazyView label={label}>
          <LazyMyMessagesPage />
        </LazyView>
      );
    case 'ai-map':
      return (
        <LazyView label={label}>
          <LazyAiMapPage
            onInvokeAgent={handlers.onInvokeAgent}
            onInvokeSkill={handlers.onInvokeSkill}
            onAskKbDocument={handlers.onAskKbDocument}
            onStartExpertTeam={handlers.onStartExpertTeam}
          />
        </LazyView>
      );
    case 'agents':
      return (
        <LazyView label={label}>
          <LazyAgentCenterPage onInvoke={handlers.onInvokeAgent} />
        </LazyView>
      );
    case 'agent-studio':
      // Agent Studio 已并入专家页；深链兜底重定向到专家
      return (
        <LazyView label={label}>
          <LazyAgentCenterPage onInvoke={handlers.onInvokeAgent} />
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
    case 'cases':
      // 已并入场景地图；兜底仍渲染样板间
      return (
        <LazyView label="案例">
          <LazyAiMapPage
            onInvokeAgent={handlers.onInvokeAgent}
            onInvokeSkill={handlers.onInvokeSkill}
            onAskKbDocument={handlers.onAskKbDocument}
            onStartExpertTeam={handlers.onStartExpertTeam}
          />
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
    case 'portal-ops':
      return (
        <LazyView label={label}>
          <LazyPortalContentOpsPage />
        </LazyView>
      );
    default:
      return (
        <HomePage
          onSubmitTask={handlers.onSubmitTask}
          onInvokeAgent={handlers.onInvokeAgent}
          onInvokeSkill={handlers.onInvokeSkill}
          onAskKbDocument={handlers.onAskKbDocument}
        />
      );
  }
}
