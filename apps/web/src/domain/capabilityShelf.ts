/**
 * 三层能力模型（全角色口径一致）：
 * 1. 发布 `published` — 审批通过后进入前台展示
 * 2. 在线调用 `callable`（Skill）— 发布后的独立运行开关
 * 3. 精选分组 `marketShelf` / `featuredIn*` — 运营分组与推荐排序
 */

export const CAPABILITY_SHELF_HINT =
  '能力发布后进入前台；Skill 是否允许在线调用由 callable 独立控制。外部工具再配置「上架货架 / 精选置顶」进入运营分组。';

export const DO_TASK_FEATURED_HINT =
  '精选仅用于「AI工具Hub → Skill Hub → 精选推荐」运营分组；发布展示由 published 控制，在线调用另由 callable 控制。';

export const FIND_CASES_FEATURED_HINT =
  '外精选露出请在「门户运营 · 货架运营」用精选置顶配置；本字段已停用，保留仅兼容旧数据。';

export const MARKET_SHELF_SLOT_HINT =
  '外部工具选「外部工具精选」可出现在外精选货架。公司推荐前台为固定办公场景网格，场景所用工具请保持已上架并维护链接；选「不上架」则仅留在配置目录。';
