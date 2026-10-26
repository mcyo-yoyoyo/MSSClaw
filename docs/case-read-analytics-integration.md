# 案例浏览统计整合

## 基线与范围

- 整合分支：`feature/case-read-analytics-20261026`。
- 基线：`origin/main`，`28b008d`。
- 从旧目录迁入阅读统计能力，原目录的未提交代码、SQLite、素材包均保留。
- 没有恢复已经被主分支替换的 `CaseInsightArticlePage`；只保留统一资产详情页的浏览采集，不另行上报正文阅读。
- 不改变主分支的详情分享、分享浏览统计、素材导入、MinIO 图片存储、发布下架、下载 HTML 和回收站功能。

## 保留的统计能力

- 运营后台概览：浏览次数、浏览人数、被浏览文章数。
- 近 7 天、近 30 天、自定义日期（最多 90 天），刷新与错误状态。
- PV/UV 趋势，文章列表浏览指标及浏览次数排序。
- 单篇抽屉：累计/期间 PV、UV、每日趋势及明细。

## 接口与口径

- `GET /api/v1/case-insights/reads?from=YYYY-MM-DD&to=YYYY-MM-DD`：仅超级管理员。
- 正常采集只用 `POST /api/v1/market-engagement/:id/actions`，类型 `case`，动作为 `detail` 或 `detail_direct`。
- `POST /api/v1/case-insights/:id/read` 保留给旧客户端，仍要求登录，但内部改为调用平台统一详情采集，复用幂等、校验和限流，不再创建 `case_read`。
- 使用已有 `MarketEngagementEvent` 表，无新增数据库迁移。
- 事件明细全部保留，取消原有 180 天自动清理，累计 PV/UV 不随明细到期减少；此前已清理的数据不自动恢复。
- 旧阅读接口保留已有短事件 ID 的幂等键；加前缀后超过统一接口 128 字符上限时，使用固定长度 SHA-256 键，同一 ID 重试仍只计一次。
- 与平台一致：打开详情页计浏览，不承诺读完、阅读时长或滚动深度。后台预览不调用详情入口，因此不计浏览。
- 查询统一事件表，案例 ID 必须在文章表中，类型允许 `case` 和主分支兼容的旧 `unknown` / 空类型；动作仅为 `view`、`detail`、`detail_direct`。
- 包含游客与登录用户；分享直达是详情浏览的子集，不再额外加一次阅读量。
- 采用北京时间日期；UV 对全部日期和详情/分享入口的访客哈希整体去重。平台看板中的案例 UV 同步修正，不能把两种入口的人数相加。
- `case_read` / `case-insight` 历史原样保留，不删除、不转换、不与统一事件叠加。它与旧平台事件可能来自同一次打开，无法可靠匹配时不能直接相加。
- 新旧前端必须同步发布：不要保留之前同时调用两个埋点的中间版本，以免旧客户端重复发送两种详情请求。

## 补报边界

- 详情事件在当前标签页内存中短暂排队，最多 100 个，最长 5 分钟；不落 localStorage，不保证关闭页面后的补报。
- 等待初始 API 探测结束后发送，连接状态变化和浏览器 online 事件可唤醒队列；初次不可达标记不会永久阻断重试。
- 单次请求超时 20 秒，最多 3 次尝试，沿用同一 eventId；只有服务端成功响应才更新本地指标。
- 普通内网 HTTP 没有 randomUUID 时使用平台兼容的事件 ID 兜底。
- 登录身份变化时丢弃旧身份待发事件，避免把游客或其他账号的访问归给新账号。

## 数据和环境边界

本次只整合代码，不连接新生产库、不执行数据库迁移、不导入案例，也不回填过去的阅读量。
最新主分支依赖 PostgreSQL / MinIO，旧 SQLite 开发环境不能直接拿来启动这个整合版本。
已有案例正文和阅读事件可按主分支迁移工具迁往 PostgreSQL；本次未执行，须先备份并确认目标库。
统一报表直接使用平台已经生成的 visitorHash，不生成另一种用户哈希，也不推断旧 case_read 与平台访客的对应关系。
没有历史阅读事件的数据不能从案例发布时间或分享浏览数倒推。

## 验证

`apps/api/tests/caseInsightReads.test.mjs` 覆盖接口权限、旧端点转发、日期、统一事件查询、PV/UV 和空日期补齐。
`apps/api/tests/shareViews.test.mjs` 新增同一游客从两种入口打开案例的双报表一致性用例（需临时 PostgreSQL schema）。
`apps/web/tests/detailEventQueue.test.ts` 覆盖内网 HTTP 兜底、等待 API、幂等重试、身份变化和重试上限。
本次已完成独立依赖安装、Prisma Client 生成，`npm run build:react` 和 `npm run build:api` 均通过。
前端构建仍有打包体积和混合静态/动态导入提示，不影响构建完成。
遵循工作区约定，未自动运行测试或浏览器验收；未启动需要 PostgreSQL / MinIO 的新 API。
待明确授权后，可运行 `npm run test:case-insight-reads --workspace @mss-claw/api`。
