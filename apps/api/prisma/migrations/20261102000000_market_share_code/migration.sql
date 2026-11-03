-- 分享链接编号：分享事件记下编号（谁分享了什么），打开链接的 detail_direct 事件记下来自哪个编号。
ALTER TABLE "market_engagement_event" ADD COLUMN "share_code" TEXT;
CREATE INDEX "market_engagement_event_share_code_idx" ON "market_engagement_event"("share_code");
