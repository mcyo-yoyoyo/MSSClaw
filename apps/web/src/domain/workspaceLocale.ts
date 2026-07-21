import { WORKSPACE_LIST } from '@/domain/workspace';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

export type WorkspaceLocale = 'zh-CN' | 'en' | 'es';

const LOCALE_BY_WORKSPACE: Record<string, WorkspaceLocale> = {
  [PROTOTYPE_WORKSPACE_ID]: 'zh-CN',
  'ws-apac': 'en',
  'ws-3c-latam': 'es',
  'ws-mea': 'en',
  'ws-eurasia': 'en',
  'ws-europe': 'en',
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
