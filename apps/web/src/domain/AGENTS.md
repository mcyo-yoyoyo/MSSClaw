# domain/

> L2 · [项目索引](../../../../AGENTS.md)

页面和 store 从此目录导入业务类型、规则及浏览器端操作。`prototype/` 定义原型资产类型，`agents/` 与 `skills/` 定义各自目录和运行能力，`persistence/` 封装浏览器存储。

`agentLifecycle.ts` 提供 Agent 成熟度选项，并为详情页选择使用入口。

## 办公工具入口

| 文件 | 职责 |
| --- | --- |
| `desktopClientLaunch.ts` | 用隐藏 iframe 请求客户端协议。页面失焦时清理请求，两秒后页面仍可见时执行备用入口。 |
| `employeeAssistantLaunch.ts` | 按资产 ID 识别员工助手。请求 `weclaw://`，超时后在新标签页打开配置的地址。 |
| `officeAceLaunch.ts` | 识别果办的中英文名称。请求 `officeace://`，超时后在当前标签页打开配置的地址。 |
| `internalOfficeScenes.ts` | 连接办公场景与目录工具，按来源场景和工具绑定读取场景使用指导。 |

[PROTOCOL]: Update this header on change, then check AGENTS.md
