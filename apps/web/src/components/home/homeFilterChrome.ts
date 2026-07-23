/**
 * 首页筛选条统一尺寸：场景案例/技能/专家/工具 Tab 与右侧组织视角下拉同高对齐。
 * 单行时轨道/触发器均为 32px；芯片 28px；字号 11px。多行时轨道可增高。
 */
export const HOME_FILTER_TRACK_CLASS =
  'flex min-h-8 max-w-full flex-wrap content-center items-center gap-0.5 rounded-full bg-zinc-100/90 p-0.5';

export const HOME_FILTER_CHIP_CLASS =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium leading-none transition';

export const HOME_FILTER_CHIP_ACTIVE = 'bg-white text-zinc-900 shadow-sm';
export const HOME_FILTER_CHIP_IDLE = 'text-zinc-500 hover:text-zinc-800';

/** 右侧组织视角等下拉触发器，与单行轨道同高 */
export const HOME_FILTER_TRIGGER_CLASS =
  'flex h-8 w-full items-center justify-between gap-1 rounded-full border bg-white px-2.5 text-left text-[11px] font-medium leading-none outline-none transition';
