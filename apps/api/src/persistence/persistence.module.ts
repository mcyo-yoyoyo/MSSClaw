import { Module } from '@nestjs/common';
import { PersistenceController } from './persistence.controller';
import { PersistenceService } from './persistence.service';
import { BlobStoreService } from './blob-store.service';
import { PlatformDocsService } from './platform-docs.service';
import { AuthController, PlatformDocsController } from './platform-docs.controller';
import { AiDailyNewsController } from './ai-daily-news.controller';

@Module({
  controllers: [
    PersistenceController,
    PlatformDocsController,
    AuthController,
    AiDailyNewsController,
  ],
  providers: [PersistenceService, BlobStoreService, PlatformDocsService],
  exports: [BlobStoreService, PlatformDocsService],
})
export class PersistenceModule {}
