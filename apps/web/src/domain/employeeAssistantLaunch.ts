/** 内部办公推荐里的员工助手。点击后先唤起本地桌面端，未安装再打开下载页。 */
export const EMPLOYEE_ASSISTANT_TOOL_ID = 'tool-hw-assistant';

const LAUNCH_URL = 'weclaw://';
const DETECT_MS = 2000;

export function isEmployeeAssistantTool(toolId: string | undefined): boolean {
  return toolId === EMPLOYEE_ASSISTANT_TOOL_ID;
}

/**
 * 用隐藏 iframe 打开 weclaw://。窗口失焦视为已唤起；2 秒后页面仍在前台则打开下载页。
 */
export function launchEmployeeAssistant(options: {
  name: string;
  fallbackUrl: string;
  notify: (message: string) => void;
}): void {
  const hiddenFrame = document.createElement('iframe');
  hiddenFrame.style.display = 'none';
  hiddenFrame.src = LAUNCH_URL;
  document.body.appendChild(hiddenFrame);

  let settled = false;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    hiddenFrame.remove();
    window.removeEventListener('blur', onBlur);
    window.clearTimeout(timer);
  };
  const onBlur = () => cleanup();
  const timer = window.setTimeout(() => {
    const stillHere = !document.hidden;
    cleanup();
    if (!stillHere || !options.fallbackUrl || options.fallbackUrl === '#') return;
    options.notify('未检测到员工助手桌面端，正在打开下载页…');
    window.open(options.fallbackUrl, '_blank', 'noopener,noreferrer');
  }, DETECT_MS);

  window.addEventListener('blur', onBlur);
  options.notify(`正在打开：${options.name}`);
}
