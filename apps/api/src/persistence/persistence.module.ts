import { Module } from '@nestjs/common';
import { PersistenceController } from './persistence.controller';
import { PersistenceService } from './persistence.service';
import { BlobStoreService } from './blob-store.service';

@Module({
  controllers: [PersistenceController],
  providers: [PersistenceService, BlobStoreService],
  exports: [BlobStoreService],
})
export class PersistenceModule {}
