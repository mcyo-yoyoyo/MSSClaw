import { WORKSPACE_LIST } from '@/domain/workspace';

export type WorkspaceLocale = 'zh-CN' | 'en' | 'es';

const LOCALE_BY_WORKSPACE: Record<string, WorkspaceLocale> = {
  'ws-cn-marketing': 'zh-CN',
  'ws-3c-latam': 'es',
  'ws-oversea-channel': 'en',
  'ws-service-ops': 'zh-CN',
};

const LOCALE_LABELS: Record<WorkspaceLocale, string> = {
  'zh-CN': '中文',
  en: 'English',
  es: 'Español',
};

export function getWorkspaceLocale(workspaceId: string): WorkspaceLocale {
  return LOCALE_BY_WORKSPACE[workspaceId] ?? 'zh-CN';
}

export function getWorkspaceLocaleLabel(workspaceId: string): string {
  return LOCALE_LABELS[getWorkspaceLocale(workspaceId)];
}

export function getWorkspaceDisplayName(workspaceId: string): string {
  return WORKSPACE_LIST.find((w) => w.id === workspaceId)?.name ?? workspaceId;
}
