import { SkillRunLauncher } from './skill-run-launcher';
import { SkillRunsController } from './skill-runs.controller';
import { SkillRunService } from '../skill-worker/skill-run.service';
import { Module } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  controllers: [ExecutionsController, SkillRunsController],
  providers: [ExecutionsService, SkillRunService, SkillRunLauncher],
})
export class ExecutionsModule {}
