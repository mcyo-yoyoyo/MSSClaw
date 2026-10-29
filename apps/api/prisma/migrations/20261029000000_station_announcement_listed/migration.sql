-- 公告下架：已有公告默认仍在架。
ALTER TABLE "station_announcement"
    ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true;
