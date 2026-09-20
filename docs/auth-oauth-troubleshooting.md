# 企业统一身份登录 · 内网部署与排障手册

面向在内网部署并验证登录的人。设计说明见 [auth-oauth-login-design.md](auth-oauth-login-design.md)。

**一句话原则**：出问题先看两处——页面上的**错误码 + traceId**，和服务端日志里 `[oauth]` 开头的行。两者能对上，基本就能定位。

---

## 0. 三级验证阶梯

登录流程能被脚本验证到什么程度，取决于是否需要"真人在 IDaaS 输密码"这一步。按需要的人工量从少到多：

| 层级 | 命令 | 碰真实 IDaaS | 需要真人 | 验到什么 |
|------|------|:---:|:---:|------|
| **① 本平台全链路** | `npm run verify:oauth` | 否 | 否 | 启动真实 Nest + 真实 SQLite，用假 IDaaS 跑完整登录。验路由挂载、守卫、会话落库、令牌透传、密码通道已关、state 防重放、授权码一次性、登出失效 |
| **② 上游配置预检** | `npm run preflight:oauth` | **是** | 否 | 网络连通、**client_id 是否注册**、**redirect_uri 是否匹配**、端点路径。每项都带"故意填错"的对照组，防止把"上游没校验"误判成"配置正确" |
| **③ 字段实测** | `npm run probe:oauth -- --env=beta` | **是** | **是**（浏览器登录一次） | userinfo 实际返回哪些字段，以及 **client_secret 是否正确** |

**建议顺序**：改完代码跑 ①；配完参数跑 ②；②全绿后跑一次 ③ 把字段定下来；最后在部署环境点一次真实登录。

### 哪些事脚本验不了

- **client_secret 的正确性**。实测 `uniportal-beta` 的 `accesstoken` 端点**先校验 `code`**：真假 secret 都回 `E_10009`，所以用假 code 反推不出 secret。它只能在一次真实换码里被验到——③ 里 secret 若不对会明确报 `E_10002`。
- **用户在 IDaaS 登录页输密码那一步**。这是设计使然，没有非交互式授权方式可绕。
- **部署机的网络**。①② 在哪台机器跑就只代表那台机器；部署机要用 `GET /auth/oauth/diagnostics` 的 `upstream` 项单独复验。

---

## 1. 部署步骤

```bash
# ① 填配置（模板里每一项都有说明）
cp deploy/oauth.env.example apps/api/.env.oauth
vi apps/api/.env.oauth

# ② 重启 API，启动日志会立刻打出配置自检结果
npm run start:api:test          # 或 start:api:prod

# ③ 不用等真人登录，先打自检接口
curl -s http://localhost:3000/api/v1/auth/oauth/diagnostics | python3 -m json.tool
```

前端不需要配任何 OAuth 参数，照常构建即可（`npm run build:web:test` / `build:web:prod`）。
Nginx 也不用改：回调路径 `/oauth/callback` 已被现有的 `try_files $uri $uri/ /index.html` 覆盖。

### 启动日志长这样

配置没问题：

```
[oauth] AUTH_MODE = oauth（企业统一身份登录）
[oauth] OAUTH_ISSUER_BASE = https://uniportal-beta.huawei.com
[oauth] OAUTH_CLIENT_SECRET = 已配置（32 位）
[oauth] OAUTH_REDIRECT_URI = https://claw-test.example.com/oauth/callback（须与 IDaaS 注册值逐字符一致…）
[oauth] 配置自检通过，等待登录请求
```

少配了东西会直接 ERROR 点名，不用等用户来点登录才发现：

```
[oauth] 配置不完整，登录会失败：OAUTH_CLIENT_SECRET、OAUTH_REDIRECT_URI。
        填好 apps/api/.env.oauth 后重启；自检接口 GET /api/v1/auth/oauth/diagnostics
```

### 自检接口读什么

| 字段 | 看什么 |
|------|--------|
| `ready` | `false` 就别急着点登录，先看 `errors` |
| `errors` | 缺哪一项、为什么不合格，直接可读 |
| `upstream` | 服务器能不能连到 IDaaS。不通会告诉你是 DNS、端口还是证书问题 |
| `authorizeUrlSample` | **实际会发出去的授权链接**，拿它和 IDaaS 注册值逐字符核对 `redirect_uri` |
| `state.instanceId` | 多实例部署时用它确认回调是不是落到了另一个实例 |
| `fieldAliases` | 当前生效的 userinfo 字段别名 |

> 接口不返回任何 secret 值本身（只说"已配置 N 位"）。后端若开了 `API_KEY`，记得带 `-H "X-API-Key: …"`。
> 上线稳定后可用 `OAUTH_DIAGNOSTICS=0` 关掉。

---

## 2. 真人登录失败时怎么查

失败**不会**静默跳走。回调页会把这些摆出来：

- 用户看得懂的提示（如"账号尚未开通平台权限"）
- **错误码**（如 `oauth_identity_unmapped`）
- **traceId**（如 `a47c157e`）
- **怎么处理**：直接写了下一步动作
- 「详细信息」折叠区 + **复制诊断信息**按钮

让用户点一下「复制诊断信息」发过来，里面已经包含错误码、traceId、上游原因、回调地址、浏览器信息。

服务端对着 traceId 捞完整链路：

```bash
grep 'oauth' api.log | grep 'a47c157e'
```

典型的一次成功登录：

```
[oauth][a47c157e] authorize_url · ws=ws-mss-ai returnTo=#/market-internal (+0ms)
[oauth][a47c157e] state_ok · ws=ws-mss-ai (+8213ms)
[oauth][a47c157e] accesstoken_ok · direct HTTP 200 142ms 字段[access_token,refresh_token,scope,expires_in] (+8355ms)
[oauth][a47c157e] userinfo_ok · direct HTTP 200 88ms 字段[uuid,w3Account,email,userName,postName,deptName] (+8443ms)
[oauth][a47c157e] identity · email←email account←w3Account name←userName externalId←uuid postName←postName orgPath←deptName | 上游共 6 个字段: uuid,w3Account,email,userName,postName,deptName (+8443ms)
[oauth][a47c157e] login_ok · user=u-jh role=business_user (+8461ms)
```

**`identity` 这一行是首次联调最有用的一行**：上游到底给了哪些字段、我们认出了哪几个，一目了然。

---

## 3. 错误码速查

| 错误码 | 含义 | 怎么办 |
|--------|------|--------|
| `oauth_config_incomplete` | 服务端配置没填全，压根没发起授权 | 打诊断接口看 `errors`，补 `.env.oauth` 后重启 |
| `oauth_not_enabled` | 后端 `AUTH_MODE` 不是 `oauth`，或部署的是旧版 API | 确认 `.env.oauth` 被加载、部署的是最新构建 |
| `idaas_*` | IDaaS 在回调里直接返回了 error，没进入本平台逻辑 | 核对应用注册状态与 `redirect_uri` |
| `oauth_code_missing` | 回调地址没带 `code` | 多为直接访问了回调页；若是 IDaaS 跳回来的，核对注册的 `redirect_uri` |
| `oauth_state_invalid` | state 不存在 / 已用过 / 过期 | 详见下方 §4.1 |
| `oauth_exchange_failed` | 换 `access_token` 失败 | 看 detail 里的 `E_*` 码，见下方 §4.2 |
| `oauth_userinfo_failed` | 取用户信息失败 | 同上；`E_10010` 是令牌过期，重新登录即可 |
| `oauth_identity_empty` | 上游返回里认不出账号也认不出 uuid | 见下方 §4.3（最可能遇到的一个） |
| `oauth_identity_unmapped` | 身份认出来了，但成员表里没这个人 | 在「组织权限」加成员，或开 `OAUTH_JIT_PROVISION=1` |
| `oauth_jit_needs_email` | 开了自动建号但上游没给邮箱/账号 | 配 `OAUTH_FIELD_EMAIL` 或 `OAUTH_DEFAULT_EMAIL_DOMAIN` |
| `oauth_domain_not_allowed` | 邮箱域不在白名单 | 检查 `OAUTH_ALLOWED_EMAIL_DOMAINS` |
| `oauth_member_suspended` | 成员被停用 | 在「组织权限」里恢复 |
| `http_401` | 后端开了 `API_KEY`，前端没带 | 配 `VITE_API_KEY` 重新构建，或在运行时偏好里填 |
| `http_404` | 部署的 API 没有统一身份登录路由 | 部署的不是最新构建 |
| `network_unreachable` | 浏览器连不上后端 | Nginx 没反代 `/api`，或 API 进程没起 |

---

## 4. 高频问题详解

### 4.1 `oauth_state_invalid`

detail 会直接告诉你是哪一种：

- **「已被使用过」** —— 用户刷新了回调页。授权码本来就是一次性的，重新登录即可，不是故障。
- **「已过期」** —— 从点登录到输完密码超过了 10 分钟。可用 `OAUTH_STATE_TTL_MS` 调大。
- **「不存在」** —— 两种可能：
  - API 在用户登录过程中重启过 → 重新点一次登录即可。
  - **多实例部署**：state 存在内存里，回调被负载均衡打到了另一个实例。对比 detail 里的 `instanceId` 与发起时的实例即可确认。当前实现是单实例假设，多实例需把 state 换成共享存储（Redis 或复用现有的 revisioned 文档机制）。

### 4.2 `oauth_exchange_failed` 的上游错误码

detail 里会带 IDaaS 的原始码，hint 已经翻好：

| 上游码 | 原因 | 处置 |
|--------|------|------|
| `E_10001` | client_id 不对 | 核对 `OAUTH_CLIENT_ID` |
| `E_10002` | client_secret 不对 | 核对 `OAUTH_CLIENT_SECRET`，注意别把测试的填到生产 |
| `E_10003` | redirect_uri 与注册值不一致 | **最常见**。用诊断接口的 `authorizeUrlSample` 和注册值逐字符比：协议、域名、端口、文根，少一个斜杠都不行 |
| `E_10009` | code 无效或已用过 | 30 分钟一次性，别重复提交 |

若 detail 显示 **「网络层失败」**，说明根本没连上 IDaaS，hint 会区分：

- `ENOTFOUND` → DNS 解析不了，确认服务器 DNS 或开 `OAUTH_PROXY_ENABLED=1`
- `ECONNREFUSED` / `ConnectTimeout` → 端口不通/防火墙，确认出网策略或开代理
- `CERT_*` → 缺企业根证书，导入 CA（**不要**用忽略证书的方式绕过）

### 4.3 `oauth_identity_empty`：上游字段名和预期不一样

这是最可能碰到的一个——IDaaS 的附加属性由管理平台按应用配置，字段名各家不同。

detail 里会**列出上游实际返回的所有字段名**。看到之后：

```ini
# apps/api/.env.oauth
OAUTH_FIELD_EMAIL=mailbox          # 换成日志里看到的真实字段名
OAUTH_FIELD_EXTERNAL_ID=openId
```

**改完重启就行，不用改代码重新发版。** 内置别名已覆盖 `email/mail`、`w3Account/account/loginName`、`userName/displayName/cn`、`postName/position/jobTitle`、`deptName/orgName` 等常见写法，多数情况自动认出。

想在真人登录前就把字段搞清楚，用探针脚本单独跑一次：

```bash
node apps/api/scripts/probe-uniportal-userinfo.mjs --env=beta
```

它会打印 userinfo 原始 JSON + 字段清单 + 映射体检。拿到 `access_token` 后还能用 `--access-token=` 反复验证，不用每次都走浏览器。

如果上游确实只回 `uuid`，那就得找 IDaaS 管理员在管理平台补配附加属性；或者退而用 uuid 预绑定（见设计文档 §5.2）。

### 4.4 「退不出去」：点登出又被自动登回

说明只作废了平台会话，没跳 IDaaS 退出。检查 `OAUTH_LOGOUT_REDIRECT` 是否配了——没配的话前端拿不到登出地址，就只清本地会话。该地址同样要求是注册域名下的。

### 4.5 密码登录还能用？

不应该。`AUTH_MODE=oauth` 时 `POST /api/v1/auth/login` 会返回 403 `password_login_disabled`。自己验一下：

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mcyo@huawei.com","password":"mssclaw"}'
# 期望：403 password_login_disabled
```

如果这里还能登进去，说明 `AUTH_MODE` 没生效（多半是 `.env.oauth` 没被加载），**必须先解决再上线**——演示口令 `mssclaw` 是公开的。

---

## 5. 紧急回退

```ini
# apps/api/.env.oauth
AUTH_MODE=password
```

重启 API 即可退回账号密码登录。**前端不用重新构建**——登录模式是后端下发的。

---

## 6. 上线前自查清单

- [ ] `npm run verify:oauth` 全绿（本平台侧无问题）
- [ ] `npm run preflight:oauth` 全绿（client_id / redirect_uri 已注册）
- [ ] `diagnostics` 的 `ready=true`，`upstream.ok=true`
- [ ] `authorizeUrlSample` 里的 `redirect_uri` 与 IDaaS 注册值逐字符一致
- [ ] 真人登录成功，日志里 `identity` 行的字段映射符合预期
- [ ] 登出后**不会**被 SSO 静默登回
- [ ] `POST /auth/login` 返回 403（密码通道已关）
- [ ] 演示口令关闭：`auth-credentials` 的 `policy.allowDemoPassword=false`
- [ ] 停用一个账号，确认 `OAUTH_SESSION_TTL_HOURS` 内失效
- [ ] `OAUTH_DEBUG_USERINFO=0`（排障期开过的话记得关，它会把个人信息写进日志）
- [ ] 生产首期建议 `OAUTH_JIT_PROVISION=0`，先名单制灰度
