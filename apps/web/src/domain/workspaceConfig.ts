import { WORKSPACE_CATALOG, WORKSPACE_LIST, type Workspace } from '@/domain/workspace';
import type { WorkspaceLocale } from '@/domain/workspaceLocale';

/** 租户配置页路由 id（兼容原 workspace-config） */
export const WORKSPACE_CONFIG_VIEW = 'workspace-config' as const;
export const TENANT_CONFIG_VIEW = WORKSPACE_CONFIG_VIEW;

export interface WorkspaceDisplayConfig {
  id: string;
  enabled: boolean;
  sortOrder: number;
  name: string;
  description: string;
  namespace: string;
  memberCount: number;
  locale: WorkspaceLocale;
  /** 用户新建的自定义租户（可删除）；内置租户不可删 */
  custom?: boolean;
}

export const WORKSPACE_LOCALE_LABELS: Record<WorkspaceLocale, string> = {
  'zh-CN': '中文',
  en: 'English',
  es: 'Español',
};

const DEFAULT_LOCALE_BY_ID: Record<string, WorkspaceLocale> = {
  'ws-cn-marketing': 'zh-CN',
  'ws-3c-latam': 'es',
  'ws-global-marketing': 'en',
  'ws-rd-knowledge': 'zh-CN',
};

/** 从内置 catalog 生成默认租户配置 */
export function buildDefaultWorkspaceConfigs(): WorkspaceDisplayConfig[] {
  return WORKSPACE_LIST.map((ws, index) => ({
    id: ws.id,
    enabled: true,
    sortOrder: index,
    name: ws.name,
    description: ws.description,
    namespace: ws.namespace,
    memberCount: ws.memberCount,
    locale: DEFAULT_LOCALE_BY_ID[ws.id] ?? 'zh-CN',
    custom: false,
  }));
}

export function resolveWorkspaceDisplay(
  base: Workspace,
  config?: Partial<WorkspaceDisplayConfig>,
): Workspace {
  if (!config) return base;
  return {
    id: base.id,
    name: config.name?.trim() || base.name,
    description: config.description?.trim() || base.description,
    namespace: config.namespace?.trim() || base.namespace,
    memberCount: config.memberCount ?? base.memberCount,
  };
}

/** 配置项直接转为 Workspace（自定义租户无硬编码 base 时使用） */
export function configToWorkspace(cfg: WorkspaceDisplayConfig): Workspace {
  return {
    id: cfg.id,
    name: cfg.name.trim() || cfg.id,
    description: cfg.description.trim() || `${cfg.name} 租户空间`,
    namespace: cfg.namespace.trim() || cfg.id.replace(/^ws-/, '').replace(/-/g, '.'),
    memberCount: cfg.memberCount >= 0 ? cfg.memberCount : 1,
  };
}

export function catalogWorkspaceIds(): string[] {
  return Object.keys(WORKSPACE_CATALOG);
}

export function isBuiltinTenantId(id: string): boolean {
  return catalogWorkspaceIds().includes(id);
}

export function slugifyTenantId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  const ascii = base.replace(/[\u4e00-\u9fa5]/g, '') || `tenant-${Date.now().toString(36)}`;
  return ascii.startsWith('ws-') ? ascii : `ws-${ascii}`;
}

const LS_WORKSPACE_CONFIG = 'mssclaw_workspace_config';

/** 启动时读取默认租户（避免 store 循环依赖） */
export function getInitialWorkspaceId(): string {
  try {
    const raw = localStorage.getItem(LS_WORKSPACE_CONFIG);
    if (!raw) return 'ws-3c-latam';
    const parsed = JSON.parse(raw) as { defaultWorkspaceId?: string };
    return typeof parsed.defaultWorkspaceId === 'string' ? parsed.defaultWorkspaceId : 'ws-3c-latam';
  } catch {
    return 'ws-3c-latam';
  }
}
