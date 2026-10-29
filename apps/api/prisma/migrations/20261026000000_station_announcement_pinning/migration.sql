-- 公告统一展示，旧公告默认不置顶。
ALTER TABLE "station_announcement"
    ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
    DROP COLUMN "published";

-- 补齐旧下架公告的消息详情，已有消息及各人已读态保持不变。
INSERT INTO "inbox_message" (
    "id", "kind", "title", "body", "from_name", "to_member_id", "meta", "created_at"
)
SELECT "id", 'announce', "title", "body", '能力运营', '*',
       jsonb_build_object('announcementTag', "badge"), "published_at"::TIMESTAMPTZ
FROM "station_announcement"
ON CONFLICT ("id") DO NOTHING;
