/**
 * 演示内容策略：内网正式使用时可关掉代码内置的示例案例/工具/互动等。
 *
 * 优先级：
 * 1. 构建变量 VITE_INCLUDE_DEMO_CONTENT=false → 全局关闭（部署时推荐）
 * 2. 本机开关 mssclaw_demo_content_off=1 → 运营在设置里「清空演示数据」后生效
 */

export const LS_DEMO_CONTENT_OFF = 'mssclaw_demo_content_off';

/** 构建期是否允许演示内容（默认允许，便于本地演示） */
export function envAllowsDemoContent(): boolean {
  const v = import.meta.env.VITE_INCLUDE_DEMO_CONTENT;
  if (v === 'false' || v === '0') return false;
  return true;
}

/** 本机是否已关闭演示内容 */
export function isLocalDemoContentOff(): boolean {
  try {
    return localStorage.getItem(LS_DEMO_CONTENT_OFF) === '1';
  } catch {
    return false;
  }
}

/** 当前是否注入代码内置演示内容 */
export function isDemoContentEnabled(): boolean {
  if (!envAllowsDemoContent()) return false;
  if (isLocalDemoContentOff()) return false;
  return true;
}

/** 取内置列：关闭演示时返回空数组，避免 merge 再灌回示例 */
export function demoDefaults<T>(seeds: T[]): T[] {
  return isDemoContentEnabled() ? seeds : [];
}

const CLEAR_KEY_EXACT = [
  'mssclaw_agents',
  'mssclaw_skills',
  'mssclaw_tools',
  'mssclaw_automations',
  'mssclaw_kb_docs',
  'mssclaw_content_engagement_v1',
  'mssclaw_content_user_votes_v1',
  'mssclaw_engagement_demo_queue_v1',
  'mssclaw_audit_log_v1',
  'mssclaw_audit_log_v2',
  'mssclaw_task_sessions',
];

const CLEAR_KEY_PREFIXES = [
  'mssclaw_portal_content_',
  'mssclaw_plaza_howto_',
  'mssclaw_inbox_',
  'mssclaw_sessions_',
];

/**
 * 清空本机演示相关缓存，并关闭演示内容注入。
 * 不碰登录态、成员、租户配置、账号密码。
 * 调用方应在之后刷新页面。
 */
export function clearDemoContentAndDisable(): { removed: number } {
  const removed = removeDemoContentCaches();
  localStorage.setItem(LS_DEMO_CONTENT_OFF, '1');
  return { removed };
}

/** 重新打开本机演示内容（仅当构建期仍允许时有意义） */
export function reenableLocalDemoContent(): boolean {
  if (!envAllowsDemoContent()) return false;
  localStorage.removeItem(LS_DEMO_CONTENT_OFF);
  return true;
}

function removeDemoContentCaches(): number {
  let removed = 0;
  for (const key of CLEAR_KEY_EXACT) {
    if (localStorage.getItem(key) != null) {
      localStorage.removeItem(key);
      removed += 1;
    }
  }
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (CLEAR_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      localStorage.removeItem(key);
      removed += 1;
    }
  }
  return removed;
}

/**
 * 一键恢复系统自带演示内容：清掉本机内容缓存、重新开启注入。
 * 调用方应刷新页面。构建期 VITE_INCLUDE_DEMO_CONTENT=false 时不可用。
 */
export function restoreDemoContentDefaults(): { ok: true; removed: number } | { ok: false; reason: string } {
  if (!envAllowsDemoContent()) {
    return {
      ok: false,
      reason: '当前构建已关闭演示内容（VITE_INCLUDE_DEMO_CONTENT=false），无法恢复示例',
    };
  }
  const removed = removeDemoContentCaches();
  localStorage.removeItem(LS_DEMO_CONTENT_OFF);
  return { ok: true, removed };
}

export function demoContentStatusLabel(): string {
  if (!envAllowsDemoContent()) {
    return '已关闭（部署配置：不含演示内容）';
  }
  if (isLocalDemoContentOff()) {
    return '已关闭（本机已清空演示数据）';
  }
  return '开启中（使用系统自带示例）';
}
