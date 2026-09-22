# 企业统一身份登录 · 参数申请清单

把本文档直接转给 IDaaS（UniPortal）应用注册的对接人即可。
配置怎么填见 `deploy/oauth.env.example`，验证怎么跑见 [auth-oauth-troubleshooting.md](auth-oauth-troubleshooting.md)。

---

## A. 申请前我们自己要先定的（不定就没法注册）

`redirect_uri` 必须与注册的应用域名**逐字符一致**，所以域名要先定下来。

| 项 | 说明 | 我们的值 |
|----|------|----------|
| 测试环境域名 | 含协议与端口，默认端口可不写 | `https://________` |
| 生产环境域名 | 同上 | `https://________` |
| 回调地址 | 固定用 `/oauth/callback`（代码已实现该路由，Nginx 无需改配置） | `<域名>/oauth/callback` |
| 退出回跳地址 | 退出后回到哪 | `<域名>/` |

> **强烈建议一并申请 `http://localhost:8084/callback` 作为开发回调地址。**
> 有了它，本地笔记本就能用 `--serve` 跑通完整探针，不必等测试环境部署好，
> 也不占用测试域名。很多 IDaaS 允许一个应用登记多个回调地址。

---

## B. 需要 IDaaS 管理员给我们的（注册后产出）

| 参数 | 对应配置项 | 备注 |
|------|-----------|------|
| 客户 ID | `OAUTH_CLIENT_ID` | 注册应用时生成 |
| Secret | `OAUTH_CLIENT_SECRET` | 只存服务端，不下发浏览器、不进日志 |
| 服务地址 | `OAUTH_ISSUER_BASE` | 测试 `https://uniportal-beta.huawei.com`，生产 `https://uniportal.huawei.com` |

**测试与生产通常是两套独立注册**，请分别提供，不要混用。

---

## C. 必须显式提出的附加属性申请 ⚠️

接口文档原话：*OAuth2.0 集成默认只返回 `uuid` 参数，如需要其他参数，请在管理平台添加附加信息。*

**只给 `uuid` 的话，我们无法把登录人对应到平台账号**，只能让运营按 uuid 逐个预绑定，运营成本极高。因此注册时必须一并申请在 `userinfo` 返回以下属性：

| 属性 | 必要性 | 用途 |
|------|--------|------|
| 邮箱 / w3 账号 | **必需** | 身份主键，用于匹配平台成员表 |
| 姓名 | **必需** | 成员显示名 |
| 岗位名称 | 建议 | 成员信息展示、运营批量配权的筛选依据 |
| 部门 / 组织 | 建议 | 映射平台部门维度 |
| uuid | 默认已有 | 稳定标识，账号或邮箱变更后仍能认出同一人 |

请对接人**同时告知这些属性在 `userinfo` 里的字段名**（如 `w3Account` / `postName` / `deptName`）。
不知道也不要紧——拿到凭据后我们跑一次探针就能看到真实字段名，代码支持用环境变量校正，不需要改代码。

---

## D. 需要和网络/运维确认的

- 部署 API 的服务器能否访问 `uniportal(-beta).huawei.com:443`，**是否需要走代理**。
  不通会导致全员登录失败，属上线前必验项（`GET /api/v1/auth/oauth/diagnostics` 的 `upstream` 项可复验）。

---

## E. 拿到参数后按这个顺序验

| 阶段 | 需要什么 | 命令 |
|------|---------|------|
| 现在就能做 | **什么都不需要** | `npm run verify:oauth` |
| 拿到 B 之后 | client_id / secret / issuer / redirect_uri | `npm run preflight:oauth` |
| preflight 全绿后 | 上面这些 + 一次真人浏览器登录 | `npm run probe:oauth -- --env=beta` |
| 最后 | 测试环境部署完成 | 真实点一次登录 |

---

## F. 可以直接发出去的申请话术

> 需要为「MSS AI 提效平台」注册 IDaaS OAuth2 应用，测试与生产各一套。
>
> 1. 应用域名：测试 `https://____`，生产 `https://____`
> 2. 回调地址：`<域名>/oauth/callback`；另请加 `http://localhost:8084/callback` 供开发调试
> 3. 退出回跳地址：`<域名>/`
> 4. 授权方式：授权码模式（authorization_code），scope `base.profile`
> 5. **附加属性**：除默认的 `uuid` 外，请在管理平台为本应用增加返回
>    **邮箱/w3 账号、姓名、岗位名称、部门**，并告知各自在 `userinfo` 中的字段名
> 6. 需下发：客户 ID 与 Secret（测试、生产分别提供）
