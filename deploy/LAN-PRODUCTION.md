# 内网生产部署（给业务 + IT）

> **业务同学只需把本文件 + 代码仓库发给 IT。**  
> 登录用户**不用**配置 API 地址；系统自动连当前网站下的 `/api`。

---

## 一、业务同学交给 IT 的输入（填好再发）

| 需要你提供 | 示例 | 说明 |
|------------|------|------|
| ① 代码 | 本仓库最新版（含 `deploy/` 目录） | Git 地址或打包 zip |
| ② 访问地址 | `https://claw.公司域名.com` 或 `http://192.168.x.x` | 同事浏览器打开的地址 |
| ③ 服务器 | 一台内网机器（有 Nginx 权限） | 建议 Linux；Windows 也可，由 IT 选型 |
| ④（可选）HTTPS 证书 | 公司域名证书 | 没有可先用内网 HTTP |

你本人**不用**再告诉同事去填「API 地址」。

部署完成后，用两台电脑验收：A 上传案例附件 → B 刷新能看到，即成功。

---

## 二、IT 要装什么（一句话）

**同一台（或同域名）机器上：静态前端 + Nest 后台 + Nginx 把 `/api` 转到后台。**

```
同事浏览器
  → 你们的内网地址（Nginx）
       ├─ /        → 前端静态文件（apps/web/dist）
       └─ /api/    → Nest 后台（默认本机 :3000）
```

不要只部署前端静态页（否则多用户附件仍不通）。  
不要用 Vercel / GitHub Pages 当公司正式多用户环境。

---

## 三、IT 操作步骤（复制执行）

### 1. 拉代码并构建前端

构建前端时：

- **阶段 1 体验首发建议保留演示内容**（不要设 `VITE_INCLUDE_DEMO_CONTENT=false`），便于同事先逛通路径。  
- 若必须关闭演示样例，开放前用平台运营账号导入公司 Skill/Agent/工具后再发访问地址。

```bash
cd /opt/mssclaw   # 路径自定
# git clone / 解压代码到此处

# 阶段 1 体验（推荐，带演示样例）：
npm ci
npm run build --workspace @mss-claw/web

# 若正式去演示样例（须先备好导入数据）：
# VITE_INCLUDE_DEMO_CONTENT=false npm ci
# VITE_INCLUDE_DEMO_CONTENT=false npm run build --workspace @mss-claw/web
```

若后端开启了 `API_KEY`，构建时一并写入（或事后在偏好设置里填）：

```bash
VITE_API_KEY=与后端API_KEY相同的值 VITE_INCLUDE_DEMO_CONTENT=false npm run build --workspace @mss-claw/web
```

**禁止**设置：`VITE_API_BASE_URL=http://localhost:3000`  
（会导致每台电脑去连自己本机，数据无法互通。）

### 2. 启动后端 API

```bash
cd apps/api
cp ../../deploy/api.env.example .env
# 编辑 .env（参考下列推荐值）
#   PORT=3000
#   CORS_ORIGIN=https://你们的访问地址   （与浏览器地址一致，可逗号分隔多源）
#   JSON_BODY_LIMIT=20mb
#   PACKAGE_BLOB_MAX_BYTES=209715200     （Skill / Agent 原始包最大 200 MiB）
#   HTTP_REQUEST_TIMEOUT_MS=600000       （接收完整请求最多 10 分钟）
#   THROTTLE_LIMIT=6000                 （内网 NAT 共享出口 IP，勿用过小默认）
#   MAX_CONCURRENT_SSE=200
#   BLOB_ROOT=/var/lib/mssclaw/blobs    （建议放到大磁盘）
#   DATABASE_URL="file:./prod.db"       （试点 / 小团队可用 SQLite）
#   # 百人以上共享写：换 Postgres，例如
#   # DATABASE_URL="postgresql://mssclaw:密码@127.0.0.1:5432/mssclaw"

npm run build
npm run start:prod
# 建议用 systemd / pm2 守护进程
```

### 3. 配置 Nginx

参考同目录 `nginx.mssclaw.conf.example`，关键两点：

- `server_name`、证书、`root` 指到 `apps/web/dist`
- **必须**有 `location /api/` 反代到 `127.0.0.1:3000`（不要让 SPA 的 `try_files` 吃掉 `/api`）
- 上传相关建议：`client_max_body_size 210m;`、`proxy_request_buffering off;`，并为大包上传设置至少 600 秒代理超时

### 4. 健康检查（必须过）

浏览器或 curl：

`https://你们的访问地址/api/v1/health`

应返回 JSON，且包含：

```json
{ "status": "ok", "service": "mss-claw-api" }
```

若返回 HTML 页面 → `/api` 反代失败，需修 Nginx。

---

## 四、验收清单（业务 + IT 一起点）

### 阶段 1（部门机体验 · 必须过）

1. 打开内网地址能登录（体验账号见组织权限说明，默认演示口令以登录页提示为准）。  
2. 普通同事**看不到**、也**不用填** API 地址。  
3. 开发者工具 Network：`/api/v1/health` = 200 JSON（失败则 Agent/Skill/工具无法跨人共享）。  
4. **双机共享**：电脑 A 用平台运营账号新建并保存一条 Skill（或工具）→ 电脑 B 刷新后能看到并可下载。  
5. 若构建时关闭了演示内容（`VITE_INCLUDE_DEMO_CONTENT=false`），开放前须先导入公司 Skill/Agent/工具，否则目录为空。  
6. 平台运营保存时若出现「仅存本机 / 同步失败」Toast 或顶栏橙/红条，说明 `/api` 未通，**先修部署再开放体验**。  
7. 电脑 A 上传案例附件并保存 → 电脑 B **刷新**后能打开同一附件。  
8. （可选）两人几乎同时改同一门户条目：后保存方应提示冲突并加载最新版。

补充：管理员若曾在旧版手填过 API 地址 → 偏好「数据同步」→「恢复自动连接」。

---

## 五、容量与已知边界

| 场景 | 建议 |
|------|------|
| 试点 / 部门内少人编辑 | SQLite + 本机 `BLOB_ROOT` 可先上 |
| 百人以上、多人同时改门户/货架 | **换 Postgres**；SQLite 单写者会锁等待 |
| 附件与能力包 | 普通附件仍默认 ≤12MB；Skill / Agent 原始包使用独立流式上传，默认 ≤200MiB；JSON 只存 `url`/`blobId` |
| 限流 | 默认 6000/IP/分钟（应对公司 NAT）；过严会出现集体 429 |
| How to | 部分仍偏本机 localStorage；核心案例 / 货架走共享 API |
| 会话 | 当前仍为工作区级 chats 快照；大规模多用户请勿依赖其作为每人私有聊天真相源 |
| 实时 | 门户无推送，他人改完需刷新；下一阶段可加轮询 |

硬件（如 64G+2T）通常够用；瓶颈在同步模型与数据库选型，不在内存本身。
