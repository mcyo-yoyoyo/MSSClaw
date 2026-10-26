# 案例正文阅读统计整合

## 基线与范围

- 整合分支：`feature/case-read-analytics-20261026`。
- 基线：`origin/main`，`28b008d`。
- 从旧目录迁入阅读统计能力，原目录的未提交代码、SQLite、素材包均保留。
- 没有恢复已经被主分支替换的 `CaseInsightArticlePage`；正文采集接在新的统一资产详情页中。
- 不改变主分支的详情分享、分享浏览统计、素材导入、MinIO 图片存储、发布下架、下载 HTML 和回收站功能。

## 保留的统计能力

- 运营后台概览：阅读次数、阅读人数、被阅读文章数。
- 近 7 天、近 30 天、自定义日期（最多 90 天），刷新与错误状态。
- PV/UV 趋势，文章列表阅读指标及阅读次数排序。
- 单篇抽屉：累计/期间 PV、UV、每日趋势及明细。

## 接口与口径

- `GET /api/v1/case-insights/reads?from=YYYY-MM-DD&to=YYYY-MM-DD`：仅超级管理员。
- `POST /api/v1/case-insights/:id/read`，正文 `{ "eventId": "UUID" }`：要求登录。
- 使用已有 `MarketEngagementEvent` 表，无新增数据库迁移。
- 正文 iframe 加载完成、文档可见后计一次，同一打开过程的重复回调和网络重试复用 eventId。
- 后台预览没有安装正文采集组件，因此不计阅读。游客阅读不计入本项统计，沿用原本地版本口径。
- 采用北京时间日期；UV 按登录用户哈希去重，不把每日 UV 相加当作期间 UV。
- `case_read` / `case-insight` 与主分支已有 `detail` / `detail_direct` 浏览指标独立，不重复写入分享浏览事件。

## 数据和环境边界

本次只整合代码，不连接新生产库、不执行数据库迁移、不导入案例，也不回填过去的阅读量。
最新主分支依赖 PostgreSQL / MinIO，旧 SQLite 开发环境不能直接拿来启动这个整合版本。
已有案例正文和阅读事件可按主分支迁移工具迁往 PostgreSQL；本次未执行，须先备份并确认目标库。
旧事件的 visitorHash 格式保留，避免迁移后同一读者被重新计算为不同用户。
没有历史阅读事件的数据不能从案例发布时间或分享浏览数倒推。

## 验证

`apps/api/tests/caseInsightReads.test.mjs` 提供不连接真实数据库的定向用例，覆盖接口权限、幂等、日期、PV/UV 和空日期补齐。
本次已完成独立依赖安装、Prisma Client 生成，`npm run build:react` 和 `npm run build:api` 均通过。
前端构建仍有打包体积和混合静态/动态导入提示，不影响构建完成。
遵循工作区约定，未自动运行测试或浏览器验收；未启动需要 PostgreSQL / MinIO 的新 API。
待明确授权后，可运行 `npm run test:case-insight-reads --workspace @mss-claw/api`。
