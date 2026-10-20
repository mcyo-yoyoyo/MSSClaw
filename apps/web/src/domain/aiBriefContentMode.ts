/** AI 快讯页当前看的是资讯还是案例洞察；从案例详情返回时据此回到案例列表（页面卸载后本地状态会丢） */
export type AiBriefContentMode = 'news' | 'cases';

let current: AiBriefContentMode = 'news';

export function getAiBriefContentMode(): AiBriefContentMode {
  return current;
}

export function setAiBriefContentMode(mode: AiBriefContentMode): void {
  current = mode;
}
