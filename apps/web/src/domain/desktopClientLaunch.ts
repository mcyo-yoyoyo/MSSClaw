/**
 * [INPUT]: 使用浏览器 iframe、窗口焦点和调用方提供的备用入口。
 * [OUTPUT]: 导出 launchDesktopClient 和 DesktopClientLaunchOptions。
 * [POS]: 员工助手和果办共用协议唤起与超时清理。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
export interface DesktopClientLaunchOptions {
  name: string;
  fallbackUrl: string;
  notify: (message: string) => void;
}

export function launchDesktopClient(
  protocol: 'weclaw://' | 'officeace://',
  options: DesktopClientLaunchOptions,
  openFallback: (url: string) => void,
): void {
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = protocol;

  function cleanup() {
    window.clearTimeout(timer);
    window.removeEventListener('blur', cleanup);
    frame.remove();
  }

  const timer = window.setTimeout(() => {
    cleanup();
    if (!document.hidden && options.fallbackUrl && options.fallbackUrl !== '#') {
      openFallback(options.fallbackUrl);
    }
  }, 2000);

  window.addEventListener('blur', cleanup);
  document.body.appendChild(frame);
  options.notify(`正在打开：${options.name}`);
}
