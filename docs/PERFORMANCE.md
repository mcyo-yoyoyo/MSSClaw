# 性能与并发（私服 64G / 2T · 目标约 500 人）

## 结论（先看这个）

| 部署模式 | 约 500 并发 | 说明 |
|----------|-------------|------|
| **静态前端 only**（Nginx → `apps/web/dist`） | **可以** | 每浏览器独立 `localStorage`，无共享写竞争；硬件远超需求 |
| **前端 + Nest + SQLite** | **不可以当作共享业务库** | 工作区级 last-write-wins、无用户隔离、SQLite 写串行；仅适合演示/小流量 |

**64G + 2T 不是瓶颈**——瓶颈在架构（共享态与鉴权），不在内存/磁盘。

## 推荐私服拓扑（500 人试用）

```
用户浏览器 × N
    → Nginx（TLS、gzip、静态缓存、限流）
        → apps/web/dist（主路径）
        → [可选] Nest :3000（健康检查 / 小流量演示持久化）
```

资源粗算：Nginx + OS ≈ 1–2GB；静态站点几 MB。其余 RAM 留给系统页缓存即可。

## 已做的代码侧加固（API）

- JSON body 上限默认 `8mb`（`JSON_BODY_LIMIT`）
- `helmet` + `compression`
- 全局限流 `@nestjs/throttler`（`THROTTLE_LIMIT` / `THROTTLE_TTL_MS`）
- 可选 `API_KEY`（请求头 `X-API-Key`；健康检查豁免）
- SSE 并发上限 `MAX_CONCURRENT_SSE`（默认 80）
- SQLite `WAL` + `busy_timeout`（缓解锁；**仍非 500 写并发方案**）

示例环境变量见 `deploy/api.env.example`。

## 若未来要「真·多用户共享后端」

必须另立项，至少包括：

1. Postgres（或等价）替代 SQLite  
2. JWT / SSO 鉴权，按用户隔离会话  
3. 会话/消息规范化，禁止整仓 JSON 覆盖  
4. SSE / LLM 走服务端配额与超时  
5. 服务端审计与备份  

## Nginx 示例

见 [`deploy/nginx.mssclaw.conf.example`](../deploy/nginx.mssclaw.conf.example)。
