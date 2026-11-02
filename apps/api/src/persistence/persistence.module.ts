import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { HomeController } from './home.controller';
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
import { CaseInsightsController } from './case-insights.controller';
import { CaseInsightsService } from './case-insights.service';
import { MeController } from './me.controller';
import { AdminController, OrgController } from './admin.controller';
import { IdentityBootstrapService } from './identity-bootstrap.service';
import { MenuGuard } from './menu.guard';

@Module({
  controllers: [
    PersistenceController,
    CatalogController,
    HomeController,
    GlobalToolsController,
    PlatformDocsController,
    AuthController,
    AiDailyNewsController,
    PortalAnalyticsController,
    AiBriefSubscriptionsController,
    CaseInsightsController,
    MeController,
    AdminController,
    OrgController,
  ],
  providers: [
    PersistenceService,
    BlobStoreService,
    PlatformDocsService,
    AiNewsArchiveService,
    PortalAnalyticsService,
    AiBriefSubscriptionsService,
    CaseInsightsService,
    IdentityBootstrapService,
    MenuGuard,
  ],
  exports: [PersistenceService, BlobStoreService, PlatformDocsService],
})
export class PersistenceModule {}
