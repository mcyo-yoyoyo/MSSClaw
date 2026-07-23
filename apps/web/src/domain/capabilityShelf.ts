/**
 * 两层能力模型（全角色口径一致）：
 * 1. 能力上架 `published` — 进入运营目录，可供任务/技能挂载调用
 * 2. 精选露出 `featuredIn*` — 出现在业务橱窗（做任务 / 找案例场景工具）
 */

export const CAPABILITY_SHELF_HINT =
  '能力上架后进入目录；勾选「精选露出」才会出现在业务做任务/找案例橱窗。';

export const DO_TASK_FEATURED_HINT =
  '精选露出到业务「做任务」橱窗（须同时已上架）。未勾选则仅留在配置目录。';

export const FIND_CASES_FEATURED_HINT =
  '精选露出到业务「找案例 · 场景工具」（须同时已上架）。连接器类工具通常由技能调用，不必精选到广场。';
