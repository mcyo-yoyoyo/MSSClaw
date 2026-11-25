/**
 * [INPUT]: 使用内部工具名称、配置的入口和 desktopClientLaunch。
 * [OUTPUT]: 导出 isOfficeAceTool 和 launchOfficeAce。
 * [POS]: 工具详情使用此模块识别并唤起果办桌面端。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { launchDesktopClient, type DesktopClientLaunchOptions } from './desktopClientLaunch.ts';

export function isOfficeAceTool(name: string): boolean {
  return /^(?:果办|officeace|果办\s*\(\s*officeace\s*\))$/i.test(name.normalize('NFKC').trim());
}

export function launchOfficeAce(options: DesktopClientLaunchOptions): void {
  launchDesktopClient('officeace://', options, (url) => {
    options.notify('未检测到果办桌面端，正在打开工具入口…');
    window.location.assign(url);
  });
}
