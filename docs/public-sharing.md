# 临时公网分享

本机需要先运行 Docker、数据库和 Nest API，并已有 `npm run build` 的前端构建产物。无需把 Vite 开发服务直接暴露到公网。

```powershell
powershell -NoProfile -File scripts/start-public-share.ps1
```

脚本输出一个临时 HTTPS 网址。通过 Windows 自带 SSH 客户端连接 localhost.run，转到本机 `127.0.0.1:5180` 的独立分享入口。重启隧道可能更换网址；电脑关机或隧道断开即不可用。进程、网址和日志记录在不入库的 `.runlogs/`。

关闭分享，不影响本地工作台：

```powershell
powershell -NoProfile -File scripts/stop-public-share.ps1
```

## 访问范围

- 首页、快讯、已发布案例、公开且已发布的资产、MAX 访客对话继续开放。
- 匿名访问不返回员工目录、个人消息、模型配置等数据；旧写入接口在分享入口要求有效平台登录。MAX 的会话所有权仍由原服务校验。
- 登录账户继续使用原账号和后端权限；本地 `5173` 和 `3000` 的代码与配置不变。
- 静态文件仅从构建目录读取，隐藏文件、源码目录和 source map 不开放。API 采用流式转发，不增加响应缓冲。
- 内部工具链接自身的公司网络要求仍然存在，分享平台不会把这些工具一并发布。

本次使用现有前端构建产物，完成公网首页和健康接口的连通检查，以及公开目录、匿名个人消息入口的检查。未运行自动化测试、模型生成或完整浏览器业务验收。

服务说明：[localhost.run HTTP Tunnels](https://localhost.run/docs/http-tunnels)。
