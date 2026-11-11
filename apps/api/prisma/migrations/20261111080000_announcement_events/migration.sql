CREATE TABLE "announcement_event" (
 "id" TEXT PRIMARY KEY, "announcement_id" TEXT NOT NULL, "member_id" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "source" TEXT NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "announcement_event_announcement_id_kind_member_id_idx" ON "announcement_event"("announcement_id", "kind", "member_id");
