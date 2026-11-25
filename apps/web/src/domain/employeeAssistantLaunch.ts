/**
 * [INPUT]: 使用 desktopClientLaunch 唤起本地客户端。
 * [OUTPUT]: 导出员工助手工具 ID、识别与启动函数。
 * [POS]: 工具详情与内部办公货架共用员工助手下载回退。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { launchDesktopClient, type DesktopClientLaunchOptions } from './desktopClientLaunch.ts';

export const EMPLOYEE_ASSISTANT_TOOL_ID = 'tool-hw-assistant';

export function isEmployeeAssistantTool(toolId: string | undefined): boolean {
  return toolId === EMPLOYEE_ASSISTANT_TOOL_ID;
}

export function launchEmployeeAssistant(options: DesktopClientLaunchOptions): void {
  launchDesktopClient('weclaw://', options, (url) => {
    options.notify('未检测到员工助手桌面端，正在打开下载页…');
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}
