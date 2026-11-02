/**
 * 演示内容策略：内网正式使用时可关掉代码内置的示例案例/工具/互动等。
 *
 * 优先级：
 * 1. 构建变量 VITE_INCLUDE_DEMO_CONTENT=false → 全局关闭（部署时推荐）
 * 2. 工作区 docs `demo-content.demoContentOff` → 已写入的关闭标记仍然生效
 */

import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  peekPlatformDocMemory,
} from '@/api/platformDocsApi';

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

export async function hydrateDemoContentPolicy(): Promise<void> {
  if (!canUsePlatformDocsApi()) {
    const peeked = peekPlatformDocMemory<DemoDoc>('demo-content');
    memoryDemoOff = Boolean(peeked?.demoContentOff);
    return;
  }
  try {
    const remote = await fetchPlatformDoc<DemoDoc>('demo-content');
    memoryDemoOff = Boolean(remote?.demoContentOff);
  } catch {
    /* keep */
  }
}

