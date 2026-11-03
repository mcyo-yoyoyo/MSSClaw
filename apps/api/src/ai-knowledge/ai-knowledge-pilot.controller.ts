import { AiKnowledgeSuggestionsService } from './ai-knowledge-suggestions.service';
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiKnowledgePilotService } from './ai-knowledge-pilot.service';

@Controller('ai-knowledge/pilot')
export class AiKnowledgePilotController {
  constructor(private readonly pilot: AiKnowledgePilotService, private readonly knowledge: AiKnowledgeService, private readonly suggestions: AiKnowledgeSuggestionsService) {}
  private actor(req: Request) {
    const authorization = req.header('authorization') || '';
    const token = /^bearer /i.test(authorization) ? authorization.slice(7).trim() : req.header('x-session-token');
    return this.knowledge.resolveActor('ws-cn-marketing', token, req.header('x-visitor-id'), `${req.ip}|${req.header('user-agent')}`);
  }
  @Get('suggestions')
  async prompts(@Query('mode') mode?:string){return this.suggestions.list(mode||'solution');}
  @Get('sessions')
  async list(@Req() req: Request, @Query('offset') offset?: string) { return this.pilot.list(await this.actor(req), offset ? Number(offset) : 0); }
  @Post('import-preview')
  async importPreview(@Req() req: Request, @Body() body: { visitorId?: string }) {
    return this.pilot.importPreview(await this.actor(req), body?.visitorId || '');
  }
  @Post('import-local')
  async importLocal(@Req() req: Request, @Body() body: unknown) {
    return this.pilot.importLocal(await this.actor(req), body);
  }
  @Get('sessions/:id')
  async read(@Req() req: Request, @Param('id') id: string) { return this.pilot.read(await this.actor(req), id); }
  @Post('legacy/:kind/:id/resume')
  async resume(@Req() req: Request, @Param('kind') kind: string, @Param('id') id: string) {
    return this.pilot.resumeLegacy(await this.actor(req), kind, id);
  }
  @Post('sessions')
  async create(@Req() req: Request, @Body() body: { message?: string; mode?: 'solution' | 'insight' | 'intro' }) {
    return this.pilot.message(await this.actor(req), body?.message || '', undefined, body?.mode);
  }
  @Post('sessions/:id/messages')
  async message(@Req() req: Request, @Param('id') id: string, @Body() body: { message?: string; mode?: 'solution' | 'insight' | 'intro' }) {
    return this.pilot.message(await this.actor(req), body?.message || '', id, body?.mode);
  }
  @Post('sessions/:id/plan')
  async plan(@Req() req: Request, @Param('id') id: string, @Body() body: { confirmed?: boolean }) {
    return this.pilot.generate(await this.actor(req), id, body?.confirmed === true);
  }
}
