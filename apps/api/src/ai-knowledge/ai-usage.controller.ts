import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PlatformDocsService } from '../persistence/platform-docs.service';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiUsageService } from './ai-usage.service';
@Controller('ai-knowledge/usage')
export class AiUsageController {
 constructor(private readonly usage:AiUsageService,private readonly docs:PlatformDocsService,private readonly knowledge:AiKnowledgeService){}
 private token(req:Request){const a=req.header('authorization')||'';return /^bearer /i.test(a)?a.slice(7).trim():req.header('x-session-token');}
 private async admin(req:Request){const s=await this.docs.me(this.token(req),'ws-cn-marketing');if(!s.ok)throw new UnauthorizedException();if(s.user.platformRole!=='super_admin')throw new ForbiddenException();}
 @Get() async report(@Req() req:Request,@Query('from') from?:string,@Query('to') to?:string,@Query('q') q?:string,@Query('mode') mode?:string,@Query('page') page?:string){await this.admin(req);return this.usage.report(from,to,q,mode,Number(page||0));}
 @Get(':type/:id') async detail(@Req() req:Request,@Param('type') type:string,@Param('id') id:string){await this.admin(req);return this.usage.detail(type,id);}
 @Post('search') async search(@Req() req:Request,@Body() body:unknown){const actor=await this.knowledge.resolveActor('ws-cn-marketing',this.token(req),req.header('x-visitor-id'),`${req.ip}|${req.header('user-agent')}`);return this.usage.search(actor,body);}
}
