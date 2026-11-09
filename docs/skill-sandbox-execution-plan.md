# Skill 沙箱执行计划

本期实现 script 技能包的真实队列执行、独立 Worker、任务容器隔离、事件和私有产物下载。prompt 仍为默认一次补全；关闭脚本开关时回退 prompt 并说明。agent 仅保留类型，明确返回 not_supported。

实施顺序：模型迁移 → 清单与归档校验 → PG 队列与租约 → 独立 Worker 和驱动 → 鉴权 API → 前端事件与产物 → 示例与验证。

每任务独立 skill/input/output 目录；Docker 每任务一个非 root、无网络、只读根目录的容器，不继承宿主凭证。API 不运行脚本。输入和产物绑定成员，所有运行接口校验所有权。租约过期标记 worker_interrupted，不自动重试。离线镜像提前构建导入，运行时不安装依赖。

清单采用包根目录 skill.json；entry 为相对路径，runtime 为 python3 或 node，包含 inputs/extensions/maxCount、outputs/pattern/mime、platforms 和资源上限。第一期只接受 ZIP 包；禁止链接、路径穿越、超限解压。

后续：根据探针实测决定 agent 多轮工具执行；增加 Windows 低权限账号与 Job Object 原生降级驱动。local 仅开发测试，没有隔离，生产启动禁止。

待用户确认：部署机为 Windows Server 还是 Windows 10/11；能否提供 Linux VM/服务器和 Docker/Podman；网关是否支持工具调用（用独立探针验证）。生产建议 Worker 与 Docker 位于同一 Linux 主机，API 可继续运行 Windows，PG/S3 通过内网访问。

具体运行、环境变量和验证方法见 skill-sandbox-execution.md。
