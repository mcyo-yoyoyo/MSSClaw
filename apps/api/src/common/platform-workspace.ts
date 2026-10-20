/**
 * 平台只有一个空间。接口和前端已不再带工作区；库里旧表仍按 workspaceId 存，
 * 全部数据都属于原 ws-cn-marketing 空间，换 PG（第 2 期）时连同这一列一起去掉。
 * 统计 visitor_hash 也用它参与计算，改值会断掉历史 UV。
 */
export const PLATFORM_WORKSPACE_ID = 'ws-cn-marketing';
