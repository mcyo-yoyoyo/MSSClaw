# 站内公告发布、分享和统计

新建公告保存后为待上架，可预览、编辑、上架或删除。上架后同步到首页公告条与消息中心；下架或删除后分享详情接口拒绝访问。编辑已上架公告保留其上架状态。

配置列表和消息详情均可复制分享链接，格式为 `#/messages?announcement=<id>&source=share`，登录后在消息中心打开指定公告正文。后台预览不产生浏览事件。

每条公告展示累计分享次数、总 PV、系统入口 PV、分享入口 PV 和 UV。分享次数指成功复制链接后成功提交的分享事件，不表示实际转发人数。正文打开记录一次 PV，来源由分享链接参数区分；总 PV = 系统 PV + 分享 PV。UV 按登录账户 ID 在所有来源之间去重。旧数据不补造历史统计，从功能上线开始累计。统计请求失败显示破折号及失败提示，不能视为零。

事件由服务端从登录会话绑定用户，事件 ID 唯一约束防止重试重复计数。统计读取要求门户运营权限。下架/删除不会抹去已累计事件；重新上架沿用原公告统计。列表进入时加载统计，也可点击刷新统计。

## 部署

发布 API 前运行 `npx prisma migrate deploy`，应用 `20261111080000_announcement_events`，然后生成 Prisma Client、构建并重启 API，发布 Web。

## 验证

- API：`node --env-file=.env --test tests/announcementMetrics.test.mjs tests/stationAnnouncementBroadcast.test.mjs`（在 apps/api，先构建）；实际临时 PostgreSQL 验证上架限制、重复请求、分来源 PV、跨用户 UV 与原广播生命周期。
- Web：`node --experimental-strip-types --test tests/announcementRoute.test.ts tests/assetDetailRoute.test.ts`（在 apps/web）。
- 本地浏览器：新建待上架、预览、编辑、上架、后台及消息详情复制分享链接、分享直达正文、系统入口访问、刷新统计、下架链接不可用、删除。测试得到分享 2、PV 2（系统 1 / 分享 1）、UV 1。测试公告及其事件已清理。
