import { BadRequestException, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { readAssets } from '../persistence/asset-catalog';
import { pilotAssetVisible } from './ai-knowledge.resources';
import { AiKnowledgePilotService } from './ai-knowledge-pilot.service';

type Mode='solution'|'insight';
type Source={id:string;label:string;description:string};
const item=z.object({text:z.string().trim().min(8).max(90),sourceIds:z.array(z.string()).min(1).max(3)});
const resultSchema=z.object({items:z.array(item).length(6)});
type Batch={cycle:string;generatedAt:string;model:string;items:z.infer<typeof item>[]};
const modes:Mode[]=['solution','insight'];
const key=(mode:Mode)=>`max-suggestions:v1:${mode}`;
const cycle=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-9*3600000));
@Injectable()
export class AiKnowledgeSuggestionsService implements OnApplicationBootstrap {
 private readonly logger=new Logger(AiKnowledgeSuggestionsService.name);
 private readonly running=new Map<Mode,Promise<void>>();
 private readonly retryAfter=new Map<Mode,number>();
 constructor(private readonly prisma:PrismaService,private readonly pilot:AiKnowledgePilotService){}
 onApplicationBootstrap(){for(const mode of modes) void this.ensure(mode);}
 @Cron('0 9 * * *',{name:'max-daily-suggestions',timeZone:'Asia/Shanghai'})
 async scheduled(){await Promise.all(modes.map(mode=>this.ensure(mode)));}
 private async sources(mode:Mode):Promise<Source[]>{
   if(mode==='solution'){
     const groups=await Promise.all((['skill','agent','tool'] as const).map(async kind=>{
       const rows=await readAssets(this.prisma,kind);
       // Shared prompts contain public assets only. Final answers still use the actor's permissions.
       return rows.filter(row=>pilotAssetVisible(row,{})).slice(0,kind==='tool'?12:40).map(row=>({id:`${kind}:${row.id}`,label:String(row.nameZh||row.name||row.title||''),description:String(row.descZh||row.desc||row.description||'').slice(0,800)}));
     }));return groups.flat().filter(s=>s.label);
   }
   const [news,posts,cases]=await Promise.all([
     this.prisma.aiNewsFeedItem.findMany({orderBy:{publishedAt:'desc'},take:36}),
     this.prisma.aiNewsPost.findMany({orderBy:{publishedAt:'desc'},take:18}),
     this.prisma.caseInsightArticle.findMany({where:{status:'published',deletedAt:null},orderBy:{publishedAt:'desc'},take:24}),
   ]);
   return [...news.map(n=>({id:`news:${n.id}`,label:n.title,description:`${n.publishedAt} ${n.summary}`.slice(0,900)})),
     ...posts.map(n=>({id:`post:${n.id}`,label:n.title,description:`${n.publishedAt} ${n.summary}`.slice(0,900)})),
     ...cases.map(n=>({id:`article:${n.id}`,label:n.publishedTitle||'',description:`${n.publishedAt?.toISOString()||''} ${n.publishedSummary||''}`.slice(0,900)}))].filter(s=>s.label);
 }
 private async cached(mode:Mode):Promise<Batch|null>{
   const row=await this.prisma.appSetting.findUnique({where:{settingKey:key(mode)}});
   const data=row?.value as unknown as Batch|undefined;
   return data && resultSchema.safeParse(data).success && typeof data.generatedAt==='string' ? data : null;
 }
 private ensure(mode:Mode, force=false):Promise<void>{
   const current=this.running.get(mode);if(current)return current;
   if((this.retryAfter.get(mode)||0)>Date.now())return Promise.resolve();
   const work=this.refresh(mode,force).catch(()=>{this.retryAfter.set(mode,Date.now()+5*60000);this.logger.warn(`MAX ${mode} suggestions refresh failed; retaining previous batch`);}).finally(()=>this.running.delete(mode));
   this.running.set(mode,work);return work;
 }
 private async refresh(mode:Mode,force=false){
   const generationCycle=cycle();
   const prior=await this.cached(mode);if(!force && prior?.cycle===generationCycle)return;
   const sources=await this.sources(mode);if(!sources.length)throw new Error('no_sources');
   const allowed=new Set(sources.map(s=>s.id));let batch:z.infer<typeof resultSchema>|undefined;let model='';
   for(let attempt=0;attempt<2;attempt++){
     const response=await this.pilot.suggestionCompletion(mode,sources,attempt?'必须恰好6条，问题不能重复，sourceIds只能逐字复制候选ID。':'');
     const checked=resultSchema.safeParse(response.value);
     if(checked.success && new Set(checked.data.items.map(i=>i.text.replace(/[\s\p{P}]/gu,''))).size===6 && checked.data.items.every(i=>i.sourceIds.every(id=>allowed.has(id)))){batch=checked.data;model=response.model;break;}
   }
   if(!batch)throw new Error('invalid_questions');
   const record:Batch={...batch,cycle:generationCycle,generatedAt:new Date().toISOString(),model};
   const value=JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue;
   await this.prisma.appSetting.upsert({where:{settingKey:key(mode)},create:{settingKey:key(mode),value},update:{value}});
   this.logger.log(`MAX ${mode}: saved 6 AI-generated suggestions`);
 }
 async list(mode:string){
   if(mode!=='solution'&&mode!=='insight')throw new BadRequestException('不支持的提示模式');
   const batch=await this.cached(mode);const fresh=batch?.cycle===cycle();
   if(!batch){void this.ensure(mode);return {items:[],generatedAt:null,pending:true,stale:true};}
   const allowed=new Set((await this.sources(mode)).map(s=>s.id));
   const items=batch.items.filter(i=>i.sourceIds.every(id=>allowed.has(id)));
   if(!fresh || items.length!==6)void this.ensure(mode,items.length!==6);
   return {items,generatedAt:batch.generatedAt,pending:this.running.has(mode),stale:!fresh};
 }
}
