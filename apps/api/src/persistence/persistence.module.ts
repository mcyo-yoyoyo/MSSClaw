import { Module } from '@nestjs/common';
import { PersistenceController } from './persistence.controller';
import { PersistenceService } from './persistence.service';
import { BlobStoreService } from './blob-store.service';
import { PlatformDocsService } from './platform-docs.service';
import { AuthController, PlatformDocsController } from './platform-docs.controller';
import { AiDailyNewsController } from './ai-daily-news.controller';
import { AiNewsArchiveService } from './ai-news-archive.service';
import { PortalAnalyticsController } from './portal-analytics.controller';
import { PortalAnalyticsService } from './portal-analytics.service';

@Module({
  controllers: [
    PersistenceController,
    PlatformDocsController,
    AuthController,
    AiDailyNewsController,
    PortalAnalyticsController,
  ],
  providers: [
    PersistenceService,
    BlobStoreService,
    PlatformDocsService,
    AiNewsArchiveService,
    PortalAnalyticsService,
  ],
  exports: [BlobStoreService, PlatformDocsService],
})
export class PersistenceModule {}
