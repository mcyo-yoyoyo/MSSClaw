import { Controller, Get, Param } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list() {
    return this.workspacesService.findAll();
  }

  @Get(':id/catalog')
  catalog(@Param('id') id: string) {
    return this.workspacesService.findCatalog(id);
  }
}
