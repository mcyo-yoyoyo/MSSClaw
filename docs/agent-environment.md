# Agent 详情环境字段

后台 Agent 编辑表单默认展开“适配平台”和“适配流程”。适配平台每行一个，适配流程为自由文本，支持换行。保存时移除首尾空白。

两项分别写入 environment.platforms 和 environment.adaptationProcess，沿用 Agent detail JSON 持久化，不增加数据库迁移。详情侧栏显示两项；流程未填写时隐藏。平台未填写时保留原有 MSS AI提效平台默认值。

详情侧栏移除“当前状态”，生命周期字段及审批逻辑不变。

验证：Web 类型检查；临时 PostgreSQL 验证字段保存、修改、清空及旧记录兼容。未进行浏览器验收。

[PROTOCOL]: Update this header on change, then check AGENTS.md
