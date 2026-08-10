/**
 * 演示内容策略：内网正式使用时可关掉代码内置的示例案例/工具/互动等。
 *
 * 优先级：
 * 1. 构建变量 VITE_INCLUDE_DEMO_CONTENT=false → 全局关闭（部署时推荐）
 * 2. 工作区 docs `demo-content` → 运营在设置里「清空演示数据」后写入服务端
 */

import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
  peekPlatformDocMemory,
} from '@/api/platformDocsApi';

export const LS_DEMO_CONTENT_OFF = 'mssclaw_demo_content_off';

type DemoDoc = { demoContentOff?: boolean };

/** 内存态（服务端灌入）；禁止写 localStorage */
let memoryDemoOff = false;

/** 构建期是否允许演示内容（默认允许，便于本地演示） */
export function envAllowsDemoContent(): boolean {
  const v = import.meta.env.VITE_INCLUDE_DEMO_CONTENT;
  if (v === 'false' || v === '0') return false;
  return true;
}

/** 本机/工作区是否已关闭演示内容 */
export function isLocalDemoContentOff(): boolean {
  return memoryDemoOff;
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

export async function hydrateDemoContentPolicy(workspaceId?: string): Promise<void> {
  const ws = workspaceId || currentWorkspaceId();
  if (!canUsePlatformDocsApi()) {
    const peeked = peekPlatformDocMemory<DemoDoc>(ws, 'demo-content');
    memoryDemoOff = Boolean(peeked?.demoContentOff);
    return;
  }
  try {
    const remote = await fetchPlatformDoc<DemoDoc>(ws, 'demo-content');
    memoryDemoOff = Boolean(remote?.demoContentOff);
  } catch {
    /* keep */
  }
}

function persistDemoFlag(off: boolean) {
  memoryDemoOff = off;
  const ws = currentWorkspaceId();
  const payload: DemoDoc = { demoContentOff: off };
  setPlatformDocMemory(ws, 'demo-content', payload);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(ws, 'demo-content', payload);
}

/**
 * 关闭演示内容注入（写入工作区 docs）。
 * 调用方应在之后刷新页面。
 */
export function clearDemoContentAndDisable(): { removed: number } {
  persistDemoFlag(true);
  return { removed: 0 };
}

/** 重新打开演示内容（仅当构建期仍允许时有意义） */
export function reenableLocalDemoContent(): boolean {
  if (!envAllowsDemoContent()) return false;
  persistDemoFlag(false);
  return true;
}

/** @deprecated 旧 LS 清理入口，现为 no-op */
export function removeDemoContentCaches(): number {
  return 0;
}

/**
 * 一键恢复系统自带演示内容：重新开启注入并写回服务端。
 * 调用方应刷新页面。构建期 VITE_INCLUDE_DEMO_CONTENT=false 时不可用。
 */
export function restoreDemoContentDefaults():
  | { ok: true; removed: number }
  | { ok: false; reason: string } {
  if (!envAllowsDemoContent()) {
    return {
      ok: false,
      reason: '当前构建已关闭演示内容（VITE_INCLUDE_DEMO_CONTENT=false），无法恢复示例',
    };
  }
  persistDemoFlag(false);
  return { ok: true, removed: 0 };
}

export function demoContentStatusLabel(): string {
  if (!envAllowsDemoContent()) {
    return '已关闭（部署配置：不含演示内容）';
  }
  if (isLocalDemoContentOff()) {
    return '已关闭（工作区已关闭演示内容）';
  }
  return '开启中（使用系统自带示例）';
}

/** 设置页：是否已关闭演示 */
export function isDemoContentDisabledInSettings(): boolean {
  if (!envAllowsDemoContent()) return true;
  return isLocalDemoContentOff();
}
