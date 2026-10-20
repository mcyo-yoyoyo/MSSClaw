import { Controller, Get } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';

@Controller('catalog')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /** 平台目录：资源树与对话列表 */
  @Get()
  catalog() {
    return this.workspacesService.findCatalog();
  }
}
