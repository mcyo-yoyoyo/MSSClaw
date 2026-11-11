# 用户明细 Excel 导出

入口：数据看板 → 用户分析 → 用户明细 → 导出 Excel。

导出当前时间范围内访问过页面的全部登录用户。分页只影响展示，不限制导出行数。排序与页面一致，按活跃时间倒序。

列：用户名、领域、区域、首次登录时间、活跃时间、页面浏览数 PV、累计登录次数。日期沿用页面的北京时间格式；PV 和累计登录次数为数值单元格。累计登录次数沿用原统计口径，不因导出改成区间登录次数。

文件名包含统计起止日期。加载中、读取失败或无用户明细时禁用导出。导出失败在表格上方显示提示。

实现：`apps/web/src/features/ops/PortalTrafficPanel.tsx` 复用完整 `userRows`，动态加载项目已有的 xlsx；不增加 API，也不读取分页后的 `pagedUserRows`。

验证：Web TypeScript 检查通过。未执行浏览器下载验收。

[PROTOCOL]: Update this header on change, then check AGENTS.md
