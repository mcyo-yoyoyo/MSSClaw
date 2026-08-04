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

```bash
cd /opt/mssclaw   # 路径自定
# git clone / 解压代码到此处

# 正式环境建议关掉演示样例注入
VITE_INCLUDE_DEMO_CONTENT=false npm ci
VITE_INCLUDE_DEMO_CONTENT=false npm run build --workspace @mss-claw/web
```

**禁止**设置：`VITE_API_BASE_URL=http://localhost:3000`  
（会导致每台电脑去连自己本机，数据无法互通。）

### 2. 启动后端 API

```bash
cd apps/api
cp ../../deploy/api.env.example .env
# 编辑 .env：
#   PORT=3000
#   CORS_ORIGIN=https://你们的访问地址   （与浏览器地址一致）
#   JSON_BODY_LIMIT=8mb
#   DATABASE_URL="file:./prod.db"       （小团队 SQLite 即可）

npm run build
npm run start:prod
# 建议用 systemd / pm2 守护进程
```

### 3. 配置 Nginx

参考同目录 `nginx.mssclaw.conf.example`，关键两点：

- `server_name`、证书、`root` 指到 `apps/web/dist`
- **必须**有 `location /api/` 反代到 `127.0.0.1:3000`（不要让 SPA 的 `try_files` 吃掉 `/api`）

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

1. 打开内网地址能登录。  
2. 普通同事**看不到**、也**不用填** API 地址。  
3. 管理员若曾在旧版手填过地址：偏好 →「数据同步」→「恢复自动连接」。  
4. 开发者工具 Network：`/api/v1/health` = 200 JSON。  
5. 电脑 A 上传案例附件并保存 → 电脑 B 刷新后能打开同一附件。

---

## 五、已知边界（下一阶段再升级）

- 附件暂存在共享库的 JSON（单文件约 ≤3MB）；量大再上对象存储。  
- 小团队 SQLite 够用；写并发高再换 Postgres（改 `DATABASE_URL`）。  
- How to 等少数配置可能仍偏本机；核心案例 / 货架 / 会话走共享 API。
