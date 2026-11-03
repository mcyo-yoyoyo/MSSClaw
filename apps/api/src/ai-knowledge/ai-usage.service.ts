import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { aiContext, setAiUsageSink } from '../common/ai-usage-context';
import type { AiKnowledgeActor } from './ai-knowledge.types';
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const day = (v: string) => new Date(v).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
type Doc = Record<string, any>;
@Injectable()
export class AiUsageService {
 constructor(private readonly prisma: PrismaService) {
  setAiUsageSink(async event => { await this.prisma.appSetting.create({data:{settingKey:'ai-usage:call:'+event.id,value:json(event)}}); });
 }
 async operation<T>(actor: AiKnowledgeActor, sessionId: string | undefined, purpose: string, fn: () => Promise<T>) {
  return aiContext.run({ ownerKey: actor.key, userId: actor.userId, sessionId, operationId: randomUUID(), purpose }, fn);
 }
 async search(actor: AiKnowledgeActor, body: unknown) {
  const {z} = await import('zod');
  const checked=z.object({eventId:z.string().uuid(),query:z.string().trim().min(1).max(200),results:z.array(z.object({id:z.string().max(200),kind:z.enum(['tool','skill','agent']),label:z.string().max(400),description:z.string().max(4000).optional(),icon:z.string().max(200).optional()})).max(500)}).safeParse(body);
  if(!checked.success) throw new BadRequestException('搜索记录格式不正确');
  const value={...checked.data,id:checked.data.eventId,ownerKey:actor.key,ownerMemberId:actor.userId,at:new Date().toISOString(),mode:'search'};
  await this.prisma.appSetting.upsert({where:{settingKey:'ai-usage:search:'+value.id},create:{settingKey:'ai-usage:search:'+value.id,value:json(value)},update:{}});
  return {ok:true};
 }
 private async rows(prefix: string) { return (await this.prisma.appSetting.findMany({where:{settingKey:{startsWith:prefix}}})).map(r=>({key:r.settingKey,value:r.value as Doc,at:r.updatedAt.toISOString()})); }
 async report(from?:string,to?:string,query='',mode='',page=0) {
  const today=day(new Date().toISOString()); from=from||today;to=to||today;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to||!Number.isInteger(page)||page<0) throw new BadRequestException('筛选范围无效');
  const within=(at:string)=>Boolean(at)&&day(at)>=from!&&day(at)<=to!;
  const [sessions,calls,searches,members]=await Promise.all([this.rows('ai-knowledge-pilot:'),this.rows('ai-usage:call:'),this.rows('ai-usage:search:'),this.prisma.member.findMany({select:{id:true,name:true}})]);
  const identities=new Map(members.map(m=>[createHash('sha256').update('user:'+m.id).digest('hex'),{key:'user:'+m.id,name:m.name}]));
  const identity=(r:Doc,key?:string)=>{const found=key?identities.get(key.split(':')[1]):undefined;return {owner:r.ownerKey||found?.key||key?.split(':')[1]||'unknown',name:members.find(m=>m.id===r.ownerMemberId)?.name||found?.name||'访客'};};
  const total=(items:Doc[])=>({tokens:items.reduce((n,c)=>n+(c.inputTokens??0)+(c.outputTokens??0),0),unknown:items.filter(c=>c.inputTokens==null||c.outputTokens==null).length,calls:items.length});
  const allCalls=calls.map(c=>c.value);const rangeCalls=allCalls.filter(c=>within(c.at));
  let rounds=0;const people=new Set<string>();
  const records:Doc[]=[];
  for(const row of sessions){const s=row.value;if(!Array.isArray(s.messages)) continue;const who=identity(s,row.key);const messages=s.messages as Doc[];const selected=messages.filter(m=>m.role==='assistant'&&m.at&&within(m.at));rounds+=selected.length;if(messages.some(m=>m.role==='user'&&m.at&&within(m.at)))people.add(who.owner);
   const dated=messages.filter(m=>m.at).map(m=>m.at);const plans=[...(s.plans||[]),...(s.plan?[s.plan]:[])];const active=[...dated,...plans.map(p=>p.createdAt)].some(within);const legacy=!dated.length&&within(row.at);
   if(!active&&!legacy)continue;const usage=rangeCalls.filter(c=>c.sessionId===s.id);const known=total(usage);
   records.push({id:s.id,type:'session',title:s.title,user:who.name,mode:s.mode||'solution',rounds:legacy?null:selected.length,at:s.updatedAt||row.at,tokens:known.calls?known.tokens:null,unknown:known.unknown,legacy});}
  const selectedSearches=searches.filter(r=>within(r.value.at));for(const r of selectedSearches) records.push({id:r.value.id,type:'search',title:r.value.query,user:identity(r.value).name,mode:'search',rounds:null,at:r.value.at,tokens:null,unknown:0});
  const filtered=records.filter(r=>(!query||(r.user+' '+r.title).toLowerCase().includes(query.toLowerCase()))&&(!mode||r.mode===mode)).sort((a,b)=>b.at.localeCompare(a.at));
  return {today,from,to,platform:{all:total(allCalls),today:total(allCalls.filter(c=>day(c.at)===today))},range:{people:people.size,rounds,searches:selectedSearches.length,...total(rangeCalls)},records:filtered.slice(page*30,page*30+30),count:filtered.length,page};
 }
 async detail(type:string,id:string) {
  let row;
  if(type==='search') row=await this.prisma.appSetting.findUnique({where:{settingKey:'ai-usage:search:'+id}});
  else if(type==='session') row=await this.prisma.appSetting.findFirst({where:{settingKey:{startsWith:'ai-knowledge-pilot:',endsWith:':'+id}}});
  if(!row)throw new NotFoundException('记录不存在');
  const s=row.value as Doc;const calls=(await this.rows('ai-usage:call:')).map(r=>r.value).filter(c=>c.sessionId===id);
  return {type,snapshot:s,calls};
 }
}
