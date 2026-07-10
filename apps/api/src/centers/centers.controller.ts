import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CenterRecordService } from './center-record.service';

@Controller('workspaces/:workspaceId/prompts')
export class PromptsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'prompt').then((prompts) => ({ prompts }));
  }

  @Get(':id')
  getOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.findOne(workspaceId, 'prompt', id);
  }

  @Patch(':id')
  patch(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { template?: string; lifecycle?: string },
  ) {
    return this.centers.updatePayload(workspaceId, 'prompt', id, body);
  }

  @Post(':id/advance-lifecycle')
  advance(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.advancePromptLifecycle(workspaceId, id);
  }
}

@Controller('workspaces/:workspaceId/agents')
export class AgentsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'agent').then((agents) => ({ agents }));
  }

  @Get(':id')
  getOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.findOne(workspaceId, 'agent', id);
  }

  @Patch(':id')
  patch(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { persona?: string; status?: string },
  ) {
    return this.centers.updatePayload(workspaceId, 'agent', id, body);
  }

  @Post(':id/advance-status')
  advance(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.advanceAgentStatus(workspaceId, id);
  }
}

@Controller('workspaces/:workspaceId/skills')
export class SkillsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'skill').then((skills) => ({ skills }));
  }

  @Get(':id')
  getOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.findOne(workspaceId, 'skill', id);
  }

  @Patch(':id')
  patch(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.centers.updatePayload(workspaceId, 'skill', id, body);
  }

  @Post(':id/advance-lifecycle')
  advance(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.advanceSkillLifecycle(workspaceId, id);
  }
}

@Controller('workspaces/:workspaceId/workflows')
export class WorkflowsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'workflow').then((workflows) => ({ workflows }));
  }

  @Post(':id/advance-status')
  advance(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.advanceWorkflowStatus(workspaceId, id);
  }
}

@Controller('workspaces/:workspaceId/knowledge-bases')
export class KnowledgeController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'knowledge').then((bases) => ({ bases }));
  }

  @Post(':id/documents/:docId/run-pipeline')
  runPipeline(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.centers.runKnowledgePipeline(workspaceId, id, docId);
  }
}

@Controller('workspaces/:workspaceId/tools')
export class ToolsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'tool').then((tools) => ({ tools }));
  }
}

@Controller('workspaces/:workspaceId/memory-stores')
export class MemoryController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.centers.list(workspaceId, 'memory').then((stores) => ({ stores }));
  }

  @Patch(':id/layers/:layer/policy')
  patchPolicy(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('layer') layer: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.centers.updateMemoryLayerPolicy(workspaceId, id, layer, body);
  }

  @Post(':id/run-reflection')
  runReflection(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.centers.runMemoryReflection(workspaceId, id);
  }
}
