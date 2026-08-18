/**
 * 两层能力模型（全角色口径一致）：
 * 1. 能力上架 `published` — 进入运营目录，可供任务/技能挂载调用
 * 2. 货架露出 `marketShelf` / `featuredIn*` — 出现在业务三货架橱窗
 */

export const CAPABILITY_SHELF_HINT =
  '能力上架后进入目录；外部工具再配置「上架货架 / 精选置顶」才会出现在外精选橱窗。公司推荐前台为办公场景，请维护工具链接与 How to。';

export const DO_TASK_FEATURED_HINT =
  '精选露出到「AI工具Hub · 场景技能」（须同时已上架可调用并选择业务场景）。未勾选则仅留在配置目录。';

export const FIND_CASES_FEATURED_HINT =
  '外精选露出请在「门户运营 · 货架运营」用精选置顶配置；本字段已停用，保留仅兼容旧数据。';

export const MARKET_SHELF_SLOT_HINT =
  '外部工具选「外部工具精选」可出现在外精选货架。公司推荐前台为固定办公场景网格，场景所用工具请保持已发布并维护链接；选「不上架」则仅留在配置目录。';
