import { Module } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { WebToolsService } from './web-tools.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, WebToolsService],
})
export class ExecutionsModule {}
