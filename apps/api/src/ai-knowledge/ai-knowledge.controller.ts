import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AiKnowledgeService } from './ai-knowledge.service';
import type { DemandSummary } from './ai-knowledge.types';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（第 2 期随服务层一起去掉）
import { PLATFORM_WORKSPACE_ID as workspaceId } from '../common/platform-workspace';

function bearerToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  return (xSessionToken ?? '').trim() || undefined;
}

@Controller('ai-knowledge')
export class AiKnowledgeController {
  constructor(private readonly aiKnowledge: AiKnowledgeService) {}

  @Post('drafts')
  async start(
    @Body() body: { question?: string },
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.startDraft(workspaceId, actor, body?.question ?? '');
  }

  @Get('drafts/:draftId')
  async getDraft(
    @Param('draftId') draftId: string,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.getDraft(workspaceId, actor, draftId);
  }

  @Post('drafts/:draftId/messages')
  async clarify(
    @Param('draftId') draftId: string,
    @Body() body: { message?: string },
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.clarify(workspaceId, actor, draftId, body?.message ?? '');
  }

  @Patch('drafts/:draftId/demand')
  async updateDemand(
    @Param('draftId') draftId: string,
    @Body() body: { demand?: Partial<DemandSummary> },
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.updateDemand(workspaceId, actor, draftId, body?.demand ?? {});
  }

  @Post('drafts/:draftId/generate')
  async generate(
    @Param('draftId') draftId: string,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.generate(workspaceId, actor, draftId);
  }

  @Get('solutions')
  async list(
    @Query('limit') rawLimit: string | undefined,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    const limit = Number(rawLimit ?? 50);
    return this.aiKnowledge.listSolutions(workspaceId, actor, Number.isFinite(limit) ? limit : 50);
  }

  @Get('solutions/:solutionId')
  async getSolution(
    @Param('solutionId') solutionId: string,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.getSolution(workspaceId, actor, solutionId);
  }

  @Delete('solutions/:solutionId')
  async remove(
    @Param('solutionId') solutionId: string,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    const actor = await this.actor(workspaceId, req, authorization, xSessionToken, visitorId);
    return this.aiKnowledge.deleteSolution(workspaceId, actor, solutionId);
  }

  private actor(
    workspaceId: string,
    req: Request,
    authorization?: string,
    xSessionToken?: string,
    visitorId?: string,
  ) {
    const fallback = `${req.ip ?? ''}|${req.header('user-agent') ?? ''}`;
    return this.aiKnowledge.resolveActor(
      workspaceId,
      bearerToken(authorization, xSessionToken),
      visitorId,
      fallback,
    );
  }
}

