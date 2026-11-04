import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AgentsController, SkillsController, PromptsController, WorkflowsController, KnowledgeController, MemoryController } from '../dist/centers/centers.controller.js';
import { CenterRecordService } from '../dist/centers/center-record.service.js';
import { ExecutionsController } from '../dist/executions/executions.controller.js';
import { ExecutionsService } from '../dist/executions/executions.service.js';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { MenuGuard } from '../dist/persistence/menu.guard.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { SseConcurrencyGuard } from '../dist/common/sse-concurrency.guard.js';
import { catalogScope } from '../dist/persistence/asset-catalog.js';

const viewer = { id: 'alice', platformRole: 'editor', deptIds: ['retail'], regionId: 'cn' };
let app, base, capturedUser, capturedWhere, writes = 0, modelCalls = 0;
const centers = {
  list: async (_ws, _kind, user) => { capturedUser = user; return []; },
  updatePayload: async (_ws, _kind, _id, body, user) => { capturedUser = user; writes++; return body; },
};
const db = {
  menu: { findUnique: async () => ({ fixed: false }) },
  roleMenu: { findUnique: async ({where}) => {
    const {roleId} = where.roleId_menuId;
    return roleId === 'blocked' ? null : { canEdit: roleId === 'editor' };
  } },
  execution: { findMany: async ({where}) => { capturedWhere = where; return []; } },
};
const executions = new ExecutionsService(db);
executions.createStream = async function* (input) { modelCalls++; capturedUser = input.userId; yield { type: 'done' }; };
const docs = { me: async token => token && ['alice','bob','reader','blocked'].includes(token)
  ? {ok:true,user:{...viewer,id:token,platformRole:['reader','blocked'].includes(token)?token:'editor'}}
  : {ok:false,error:'unauthorized'} };
before(async () => {
  class TestModule {}
  Module({ controllers: [AgentsController, SkillsController, PromptsController, WorkflowsController, KnowledgeController, MemoryController, ExecutionsController], providers: [MenuGuard,
    {provide:CenterRecordService,useValue:centers},{provide:ExecutionsService,useValue:executions},
    {provide:PlatformDocsService,useValue:docs},{provide:PrismaService,useValue:db}] })(TestModule);
  app = await NestFactory.create(TestModule, { logger:false }); await app.listen(0,'127.0.0.1'); base=await app.getUrl();
});
after(async()=>{await app?.close();});
async function request(path,token,method='GET',body) {
  return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
}

test('旧中心所有列表拒绝匿名与失效会话；菜单只读不能写',async()=>{
  for(const route of ['agents','skills','prompts','workflows','knowledge-bases','memory-stores']) {
    assert.equal((await request('/'+route)).status,401);
    assert.equal((await request('/'+route,'expired')).status,401);
    assert.equal((await request('/'+route,'blocked')).status,403);
  }
  assert.equal((await request('/agents','reader')).status,200);
  assert.equal((await request('/agents/a','reader','PATCH',{persona:'new'})).status,403);
  assert.equal(writes,0);
  assert.equal((await request('/agents/a','alice','PATCH',{persona:'new'})).status,200);
  assert.equal(capturedUser.id,'alice'); assert.equal(writes,1);
});
test('执行列表强制登录，按服务端身份筛选，忽略伪造 userId',async()=>{
  assert.equal((await request('/executions')).status,401);
  assert.equal((await request('/executions','expired')).status,401);
  assert.equal((await request('/executions?userId=bob','alice')).status,200);
  assert.deepEqual(capturedWhere,{userId:'alice'});
  assert.equal((await request('/executions','bob')).status,200);
  assert.deepEqual(capturedWhere,{userId:'bob'});
});
test('匿名执行不调用模型也不占并发；合法执行忽略请求体身份',async()=>{
  const count=SseConcurrencyGuard.activeCount;
  for(const token of [undefined,'expired']) assert.equal((await request('/executions/stream',token,'POST',{chatId:'c',message:'hi'})).status,401);
  assert.equal(modelCalls,0); assert.equal(SseConcurrencyGuard.activeCount,count);
  const response=await request('/executions/stream','alice','POST',{chatId:'c',message:'hi',userId:'bob'});
  assert.equal(response.status,201); await response.text();
  assert.equal(modelCalls,1); assert.equal(capturedUser,'alice'); assert.equal(SseConcurrencyGuard.activeCount,count);
});
test('旧资产列表与跨组织修改使用同一组织范围，查不到资产时不写库',async()=>{
  let where, updated=false;
  const service=new CenterRecordService({agent:{findMany:async args=>{where=args.where;return [];},update:async()=>{updated=true;}}});
  await service.list('ws','agent',viewer);
  assert.deepEqual(where,catalogScope('agent',viewer));
  await assert.rejects(service.updatePayload('ws','agent','outside',{persona:'changed'},viewer),e=>e.getStatus()===404);
  assert.equal(updated,false);
});
