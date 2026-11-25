# market/

> L2 · [项目索引](../../../../../AGENTS.md)

集市从资产目录和运营配置构建货架。详情组件展示资产资料，提报组件将新资产送入审批。

| 文件 | 职责 |
| --- | --- |
| `MarketShelfPage.tsx` | 组合外部工具、内部办公及 Skill 和 Agent 货架。负责筛选、排序和卡片操作。 |
| `MarketToolDetailModal.tsx` | 展示工具详情，按配置分别显示工具使用指导和场景使用指导。将桌面客户端启动交给[领域层](../../domain/AGENTS.md)。 |
| `MarketDetailTabs.tsx` | 为 Skill 和目录 Agent 详情渲染文字标签、选中下划线及可选角标。各详情页提供栏目与选中状态。 |
| `CatalogAgentDetailModal.tsx` | 标题展示 Agent 名称、可见范围和版本，侧栏提供使用和下载入口。 |
| `MarketAgentDetailModal.tsx` | 展示场景 Agent 的案例、演示步骤和运行入口。 |
| `MarketSkillDetailModal.tsx` | 展示 Skill 详情，按所选版本下载资源包。 |
| `MarketSubmitModal.tsx` | 提报外部工具和内部办公工具。 |
| `MarketSkillSubmitModal.tsx` | 在 Skill Hub 新建待审批的 Skill 草稿。 |

[PROTOCOL]: Update this header on change, then check AGENTS.md
