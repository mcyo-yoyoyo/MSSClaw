# Skill 沙箱执行（第一期）

script 经 PG 队列交给独立 Worker，API 只上传、入队和读事件；prompt 为默认的一次补全。agent 返回 `not_supported:agent`。脚本开关关闭时返回 prompt 回退标识，前端恢复原对话输入。没有新增 npm 依赖。

## 配置与进程

API 与 Worker 必须连接同一 PG 和 S3。Worker 从 `apps/api/.env` 加载配置，shell 环境变量优先。执行迁移前按部署惯例备份数据库。

| 环境变量 | 默认或用途 |
| --- | --- |
| `DATABASE_URL` | 必填，PostgreSQL URL |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | 必填，兼容现有 BlobStoreService |
| `S3_REGION` | `us-east-1` |
| `SKILL_SCRIPT_EXECUTION_ENABLED` | `false`，API 设为 `true` 开放脚本入队 |
| `SKILL_SANDBOX_DRIVER` | `docker`；开发可显式设 `local` |
| `SKILL_SANDBOX_CLI` | `docker`，可改为 `podman` |
| `SKILL_SANDBOX_IMAGE` | `mssclaw-python:1` |
| `SKILL_WORKER_CONCURRENCY` | `2`，PG 锁约束所有 Worker 的总并发 |
| `SKILL_RUN_PER_USER_LIMIT` | `1`，同用户 queued + running 数量上限 |
| `NODE_ENV` | 生产必须 `production`，此时 local 驱动启动失败 |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | prompt 和独立网关工具探针使用；不传入脚本容器 |

API 自身仍需现有鉴权配置（`JWT_SECRET`、`LLM_KEY_SECRET` 等），不属于脚本容器环境。Worker 不依赖模型密钥。

```sh
npm ci
npm run prisma:generate --workspace @mss-claw/api
npm exec --workspace @mss-claw/api -- prisma migrate deploy
npm run build:api
npm run dev:api
# 另一个终端，同一配置；生产建议 Linux Worker 和 Docker 在同机
npm run start:skill-worker
# 开发测试，无隔离；本机必须预装清单运行时及依赖
SKILL_SANDBOX_DRIVER=local npm run start:skill-worker
```

Worker 每秒轮询并续租，租约 30 秒。启动先清理过期任务容器并将任务标记 `worker_interrupted`，本期不自动重试；保留 attempt。退出信号会中断正在执行的任务。每任务独立临时目录，成功或失败后清理。stdout/stderr 合计最多保存 64 KiB，执行结束后生成 log 事件；长任务期间可见真实步骤开始及运行状态。

## 构建离线镜像

以下步骤在有网、与目标架构一致的 Linux 环境执行；python/pandas/openpyxl/xlsxwriter/matplotlib 固定版本，镜像包含中文字体。

```sh
docker build -t mssclaw-python:1 -f deploy/sandbox/Dockerfile.python deploy/sandbox
docker save -o mssclaw-python-1.tar mssclaw-python:1
# 将 tar 带入内网，在 Worker 的 Docker 主机导入
docker load -i mssclaw-python-1.tar
```

运行使用 `--pull=never`，不拉镜像、不装依赖。容器固定 UID/GID 10001，无网络、只读根目录、`/tmp` tmpfs、cap-drop、no-new-privileges、PID/内存/CPU 上限。只挂本任务 skill/input（只读）和 output（读写）。env 只允许 `MSSCLAW_INPUT_DIR`、`MSSCLAW_OUTPUT_DIR`、`LANG`、`TZ`。Docker bind mount 路径必须是 Docker 主机本地路径，因此不能直接让 Windows Worker 指向远程 Linux Docker daemon。

local 直接运行子进程，**没有隔离**，没有容器资源或网络限制，只供可信开发测试。Windows 原生低权限账号 + Job Object 留到后续实现。

## 技能清单和示例

只接受 ZIP，根目录包含 `skill.json`；不支持 tar、ZIP64、加密 ZIP、链接或特殊文件。最多 1000 个归档条目、100 MiB 解压内容。entry 必须是包内已存在的相对文件，拒绝绝对路径、`..`、反斜杠。上传归档本身仍复用现有 blob 包接口，在 Skill 创建/更新、整份目录写入以及运行前校验脚本包。

示例清单见 `deploy/sandbox/examples/excel-summary/skill.json`。runtime 仅 python3/node；timeoutSec 1–1800（默认120），memoryMb 64–4096（默认512）。image 可省略以使用配置镜像；镜像必须提前导入。inputs 声明扩展名及最多20个输入；outputs 声明根目录文件名或 `*` glob 与 MIME（md/txt/json/xlsx/png）。每个产物不超过20 MiB，合计不超过100 MiB；拒绝符号链接和硬链接，并检查扩展名与内容。platforms 使用 linux/darwin/win32；Docker 始终按 linux 匹配。输入文件名添加序号以防同名覆盖。

```sh
# 从仓库根目录打包，包中不能额外嵌套 excel-summary 顶层目录
(cd deploy/sandbox/examples/excel-summary && zip -r /tmp/excel-summary.zip skill.json scripts)
```

通过现有技能包上传获取 `packageBlob`，再通过有权限的 `POST /api/v1/catalog/skills` 或 `PUT /api/v1/catalog/skills/:id` 设置 `executionMode: "script"`、`packageBlob` 和版本。SkillVersion 同样保存 executionMode，旧数据默认 prompt；版本的配置与包引用在入队时固定到运行记录。

例如更新已有示例 Skill 的完整现有字段，保留名称、分类等字段，再追加：

```json
{
  "executionMode": "script",
  "version": "1.0.0",
  "packageBlob": { "id": "上传返回的blobId" }
}
```

按现有发布流程上架并开放调用。在 Skill 抽屉选择一个 xlsx，点击运行；示例输出 `summary.xlsx` 和 `summary.md`，页面显示准备、执行、保存产物的真实事件，并提供取消和下载。

## HTTP 契约

接口使用现有会话 Bearer / x-session-token 及部署 API Key。运行、事件、取消和产物均严格限定成员本人（含管理员）；其他成员得到404。私有输入和产物在通用 `/blobs/:id` 接口不可下载，必须经所属运行产物接口。

- `POST /api/v1/skill-runs/inputs`：复用 base64 上传形式 `{ name, mimeType?, dataBase64 }`，最多约20 MiB，记录成员所有权；已有通用上传 blob 没有成员绑定，不能直接作为运行输入。
- `POST /api/v1/skill-runs`：`{ skillId, version?, inputBlobIds: [] }`；返回运行，或 `{mode:"prompt",fallback,message}`。单用户超限409，不拥有的输入400。
- `GET /api/v1/skill-runs/:id`：运行状态和 artifacts。
- `GET /api/v1/skill-runs/:id/events?afterSeq=0`：按 seq 递增，最多200条，客户端持久保存游标继续拉取。
- `POST /api/v1/skill-runs/:id/cancel`：queued 立即取消，running 心跳检测取消并终止容器。
- `GET /api/v1/skill-runs/:id/artifacts/:blobId`：仅 succeeded 任务的产物，强制下载。
- `POST /api/v1/executions/stream`：保持原 prompt 协议；script 按 assetId 路由入队，可附 inputBlobIds，SSE 转发真实 SkillRunEvent（type/seq/payload）。断开 SSE 不取消持久任务，使用 cancel 接口取消。

## 验证

```sh
npm run build:api
npm exec --workspace @mss-claw/api -- node --test tests/skillSandbox.test.mjs tests/llmToolProbe.test.mjs tests/llmConfigExecution.test.mjs tests/packageUploadLimits.test.mjs
npm exec --workspace @mss-claw/web -- tsc -b
npm run test:skill-invoke-action --workspace @mss-claw/web
npm exec --workspace @mss-claw/web -- node --test tests/skillRegionVisibility.test.ts
# PG 测试按 helpers/pgTestDatabase.mjs 使用独立 schema，结束删除
# 指定测试 PG 可用 TEST_DATABASE_URL；显式配置后连接失败会报错
# S3 真实联调：设置 S3_* 后加 SKILL_TEST_S3=true 执行上述 API 测试，生成的 blob 会删除
# Docker 集成测试需要已导入 SKILL_TEST_IMAGE（默认 mssclaw-python:1），否则 skip
npm run probe:llm-tools -- --base-url http://gateway/v1 --model model-name
```

探针不进主流程，非流式和流式分别验证三轮工具调用、JSON 参数、回传 tool 消息后的正文续写，每次请求30秒超时。输出中文结论表，任一失败退出1，不输出 API Key。agent 是否可用必须以内网真实探针结果为准。

本次本机已验证 PG + local Python + 真实 MinIO 的示例产物存取；API 测试32项，31通过、1跳过。Docker CLI 参数检查通过，但无 mssclaw-python:1 镜像，真实容器隔离/断网/超时测试跳过。另有资产持久化及会话隔离15项通过，Web调用及区域可见性10项通过，API构建和Web类型检查通过。生产 local 启动拒绝已实测。网关探针通过本地模拟响应测试，未访问内网真实模型。没有浏览器交互验收、Windows/Podman/Linux 生产部署验证。
