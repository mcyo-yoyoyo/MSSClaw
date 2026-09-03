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

function bearerToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  return (xSessionToken ?? '').trim() || undefined;
}

@Controller('workspaces/:workspaceId/ai-knowledge')
export class AiKnowledgeController {
  constructor(private readonly aiKnowledge: AiKnowledgeService) {}

  @Post('drafts')
  async start(
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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
    @Param('workspaceId') workspaceId: string,
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

