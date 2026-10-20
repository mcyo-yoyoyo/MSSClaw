import { Controller, Get } from '@nestjs/common';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';
import { WorkspacesService } from './workspaces.service';

@Controller('catalog')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /** 平台目录：资源树与对话列表 */
  @Get()
  catalog() {
    return this.workspacesService.findCatalog(PLATFORM_WORKSPACE_ID);
  }
}
