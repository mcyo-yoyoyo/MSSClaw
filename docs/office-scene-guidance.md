# 办公场景使用指导

在后台「配置办公场景」编辑场景时，可填写可选的「场景使用指导」URL。支持内网或公网 HTTP/HTTPS 地址，最多 2048 字符，不接受带用户名或密码的 URL。

从办公场景进入工具详情时，详情地址携带 `sceneId`。「使用指导」优先采用该可见场景配置的 `guideUrl`，前提是工具仍绑定在该场景中。未填写、场景不存在、场景隐藏或工具已解绑时，回退到工具原有的 `docsUrl`。直接进入不带场景信息的工具详情时使用 `docsUrl`，不任意选择某个场景的指导地址。分享详情保留场景信息。「立即体验」仍使用工具的 `homepageUrl`。

数据存储在 `office_scene.guide_url`。部署时执行项目现有 Prisma migration deploy 流程，并重新生成 Prisma Client、构建并重启 API。迁移 `20261111030000_office_scene_guide_url` 只新增可空字段，旧场景不需补数据。

相关验证：
- `apps/api/tests/officeSceneGuide.test.mjs`：真实测试数据库保存、读取、清空、旧数据兼容及非法 URL 拒绝。
- `apps/web/tests/officeSceneGuide.test.ts`：跳转优先级、场景匹配、URL 校验及详情路由往返。
- 与已有办公场景顺序和网格组合测试一起，18 项通过；API 构建和前端类型检查通过。
- 本次浏览器后台验收因重启后登录态失效未完成，不将自动化测试结果视为浏览器端到端通过。
