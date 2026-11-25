# MSSClaw

MSSClaw 为企业成员提供 Skill、Agent、办公工具和场景案例。仓库通过 npm workspaces 组织前后端。

| 位置 | 职责 |
| --- | --- |
| `apps/web/` | React 与 Vite 门户。页面通过 Zustand 读取共享状态。 |
| `apps/api/` | NestJS API。Prisma 读写 PostgreSQL，上传文件存入 S3 兼容对象存储。 |
| `deploy/` | 本地基础设施、部署配置样例和 Windows 运维脚本。 |
| `docs/` | 产品契约、部署说明和历史决策。 |
| `scripts/` | Windows 本地 Docker 启动脚本。 |

开发与构建命令见 [README](README.md) 和 [根工作区配置](package.json)。工具详情的交互入口见[集市页面](apps/web/src/features/market/AGENTS.md)，客户端协议见[前端领域层](apps/web/src/domain/AGENTS.md)。
