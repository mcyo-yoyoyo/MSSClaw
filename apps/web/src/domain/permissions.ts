import { getRbacMatrix, type PermissionLevel, type PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';

const LEVEL_RANK: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  execute: 2,
  write: 3,
  admin: 4,
};

function hasAtLeast(level: PermissionLevel, min: PermissionLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

function resolveRole(role?: PlatformRole): PlatformRole {
  return role ?? useSessionStore.getState().getPlatformRole();
}

/** 是否可发起/发送对话执行（只读访客为 false） */
export function canExecuteChat(role?: PlatformRole, workspaceId?: string): boolean {
  const level = getRbacMatrix(workspaceId ?? '')[resolveRole(role)]?.chat ?? 'none';
  return hasAtLeast(level, 'execute');
}

/** 模型 API 等个人执行配置：访客不可改 */
export function canConfigureModelApi(role?: PlatformRole): boolean {
  return resolveRole(role) !== 'viewer';
}

export const READONLY_EXECUTE_HINT =
  '当前为只读访客，可浏览案例与任务结果，不可发起或发送执行';

export const OPS_ONLY_HINT = '此功能仅平台运营可见';

/** 业务壳误入运营页 */
export function opsBlockedToast(label: string): string {
  return `\u300c${label}\u300d${OPS_ONLY_HINT}`;
}

/** 展示配置未对该角色开放某菜单 */
export function roleNavDisabledToast(viewLabel: string, fallbackLabel: string): string {
  return `\u7ba1\u7406\u5458\u672a\u5bf9\u4f60\u7684\u89d2\u8272\u5f00\u653e\u300c${viewLabel}\u300d\uff0c\u5df2\u56de\u5230\u300c${fallbackLabel}\u300d`;
}
