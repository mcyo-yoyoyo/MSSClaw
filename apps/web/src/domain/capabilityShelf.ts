/**
 * 两层能力模型（全角色口径一致）：
 * 1. 能力上架 `published` — 进入运营目录，可供任务/技能挂载调用
 * 2. 货架露出 `marketShelf` / `featuredIn*` — 出现在业务三货架橱窗
 */

export const CAPABILITY_SHELF_HINT =
  '能力上架后进入目录；再配置「上架货架 / 精选露出」才会出现在业务货架橱窗。';

export const DO_TASK_FEATURED_HINT =
  '精选露出到「MSS工具集市 · 场景技能」（须同时已上架可调用并选择业务场景）。未勾选则仅留在配置目录。';

export const FIND_CASES_FEATURED_HINT =
  '精选露出到对应货架「精选推荐」条（须同时已上架到该货架）。连接器类工具通常由技能调用，可不精选。';

export const MARKET_SHELF_SLOT_HINT =
  '决定工具出现在「外部工具精选」或「公司工具推荐」。选「不上架」则仅留在配置工具目录。';
