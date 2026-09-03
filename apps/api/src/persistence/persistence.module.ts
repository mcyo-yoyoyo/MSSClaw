import { Module } from '@nestjs/common';
import { GlobalToolsController, PersistenceController } from './persistence.controller';
import { PersistenceService } from './persistence.service';
import { BlobStoreService } from './blob-store.service';
import { PlatformDocsService } from './platform-docs.service';
import { AuthController, PlatformDocsController } from './platform-docs.controller';
import { AiDailyNewsController } from './ai-daily-news.controller';
import { AiNewsArchiveService } from './ai-news-archive.service';
import { PortalAnalyticsController } from './portal-analytics.controller';
import { PortalAnalyticsService } from './portal-analytics.service';
import { AiBriefSubscriptionsController } from './ai-brief-subscriptions.controller';
import { AiBriefSubscriptionsService } from './ai-brief-subscriptions.service';

@Module({
  controllers: [
    PersistenceController,
    GlobalToolsController,
    PlatformDocsController,
    AuthController,
    AiDailyNewsController,
    PortalAnalyticsController,
    AiBriefSubscriptionsController,
  ],
  providers: [
    PersistenceService,
    BlobStoreService,
    PlatformDocsService,
    AiNewsArchiveService,
    PortalAnalyticsService,
    AiBriefSubscriptionsService,
  ],
  exports: [PersistenceService, BlobStoreService, PlatformDocsService],
})
export class PersistenceModule {}
