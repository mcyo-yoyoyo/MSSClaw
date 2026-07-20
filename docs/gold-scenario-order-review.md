# 金牌场景：订单评论分析 · 平台内可调用

## 在 MSSClaw 里怎么用

1. **技能**菜单找到「订单评论分析」（`/评论分析`）→ 点「调用」  
2. 或在 **AI助手** 输入 `/评论分析`（可加 ASIN/需求）后发送  
3. 确认执行计划 → 对话按 Skill 正文产出 VoC 报告结构  

种子：`skill-review-cluster` · 正文见 `domain/skills/orderReviewSkill.ts`  
Agent：`评论分析 Agent`（`agent-review`）

## 与 Order KSP 的关系

| 层级 | 位置 | 作用 |
|------|------|------|
| 平台对话演示 | MSSClaw 技能页 + AI助手/任务 | 挂载 instructions，出报告结构 |
| 采集真跑工程 | `D:\Vibe Coding\Order KSP` | Playwright 采集 + reporter 成稿 |
| 业务方案 | Obsidian「电渠评论分析」 | 场景价值与字段模板 |

Cursor 侧可选 Skill：`Order KSP/.cursor/skills/order-review-analysis/`（工程编排，不是平台技能页本体）。
