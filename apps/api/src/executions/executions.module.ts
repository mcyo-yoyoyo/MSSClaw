import { Module } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
})
export class ExecutionsModule {}
