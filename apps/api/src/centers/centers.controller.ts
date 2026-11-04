import { MenuGuard, RequireMenu, CurrentUser, type AuthUser } from '../persistence/menu.guard';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CenterRecordService } from './center-record.service';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（服务层还用它拼 center_record 的记录 id，对应文档迁到正式表时一起去掉）
import { PLATFORM_WORKSPACE_ID as workspaceId } from '../common/platform-workspace';

@UseGuards(MenuGuard)
@RequireMenu('prompts')
@Controller('prompts')
export class PromptsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list() {
    return this.centers.list(workspaceId, 'prompt').then((prompts) => ({ prompts }));
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.centers.findOne(workspaceId, 'prompt', id);
  }

  @Patch(':id')
  @RequireMenu('prompts', 'edit')
  patch(
    @Param('id') id: string,
    @Body() body: { template?: string; lifecycle?: string },
  ) {
    return this.centers.updatePayload(workspaceId, 'prompt', id, body);
  }

  @Post(':id/advance-lifecycle')
  @RequireMenu('prompts', 'edit')
  advance(@Param('id') id: string) {
    return this.centers.advancePromptLifecycle(workspaceId, id);
  }
}

@UseGuards(MenuGuard)
@RequireMenu('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.centers.list(workspaceId, 'agent', user).then((agents) => ({ agents }));
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.centers.findOne(workspaceId, 'agent', id, user);
  }

  @Patch(':id')
  @RequireMenu('agents', 'edit')
  patch(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { persona?: string; status?: string },
  ) {
    return this.centers.updatePayload(workspaceId, 'agent', id, body, user);
  }

  @Post(':id/advance-status')
  @RequireMenu('agents', 'edit')
  advance(@Param('id') id: string) {
    return this.centers.advanceAgentStatus(workspaceId, id);
  }
}

@UseGuards(MenuGuard)
@RequireMenu('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.centers.list(workspaceId, 'skill', user).then((skills) => ({ skills }));
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.centers.findOne(workspaceId, 'skill', id, user);
  }

  @Patch(':id')
  @RequireMenu('skills', 'edit')
  patch(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.centers.updatePayload(workspaceId, 'skill', id, body, user);
  }

  @Post(':id/advance-lifecycle')
  @RequireMenu('skills', 'edit')
  advance(@Param('id') id: string) {
    return this.centers.advanceSkillLifecycle(workspaceId, id);
  }
}

@UseGuards(MenuGuard)
@RequireMenu('workflow')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list() {
    return this.centers.list(workspaceId, 'workflow').then((workflows) => ({ workflows }));
  }

  @Post(':id/advance-status')
  @RequireMenu('workflow', 'edit')
  advance(@Param('id') id: string) {
    return this.centers.advanceWorkflowStatus(workspaceId, id);
  }
}

@UseGuards(MenuGuard)
@RequireMenu('kb')
@Controller('knowledge-bases')
export class KnowledgeController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list() {
    return this.centers.list(workspaceId, 'knowledge').then((bases) => ({ bases }));
  }

  @Post(':id/documents/:docId/run-pipeline')
  @RequireMenu('kb', 'edit')
  runPipeline(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.centers.runKnowledgePipeline(workspaceId, id, docId);
  }
}

@UseGuards(MenuGuard)
@RequireMenu('memory')
@Controller('memory-stores')
export class MemoryController {
  constructor(private readonly centers: CenterRecordService) {}

  @Get()
  list() {
    return this.centers.list(workspaceId, 'memory').then((stores) => ({ stores }));
  }

  @Patch(':id/layers/:layer/policy')
  @RequireMenu('memory', 'edit')
  patchPolicy(
    @Param('id') id: string,
    @Param('layer') layer: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.centers.updateMemoryLayerPolicy(workspaceId, id, layer, body);
  }

  @Post(':id/run-reflection')
  @RequireMenu('memory', 'edit')
  runReflection(@Param('id') id: string) {
    return this.centers.runMemoryReflection(workspaceId, id);
  }
}
