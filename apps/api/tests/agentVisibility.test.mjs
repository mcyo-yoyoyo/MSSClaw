import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { createAsset, readAsset, catalogScope, updateAsset } from '../dist/persistence/asset-catalog.js';
test('Agent visibility matches department and public bypasses region filters', async () => {
 const db=await createTestDatabase('agent_visibility');const p=new PrismaClient({datasourceUrl:db.url});
 try {
 const a={id:'agent-scope',name:'scope',desc:'',category:'office',bizLine:'',homeTag:'hr',author:'owner',publisherUserId:'owner',published:true,chatId:'chat-scope',icon:'fa-robot',color:'rose',skillIds:[],visibility:'org',ownerDeptIds:['hr'],ownerRegionIds:['europe']};
 await p.$transaction(tx=>createAsset(tx,'agent',a));
 const read=(id,deptIds,regionId,platformRole='user')=>readAsset(p,'agent',a.id,catalogScope('agent',{id,deptIds,regionId,platformRole}));
 assert.ok(await read('same',['hr'],'latam'));
 assert.equal(await read('different',['mkt'],'europe'),null);
 assert.ok(await read('owner',[],null));
 assert.ok(await read('admin',[],null,'super_admin'));
 await p.$transaction(tx=>updateAsset(tx,'agent',a.id,{...a,visibility:'public'}));
 assert.ok(await read('different',['mkt'],'latam'));
 assert.ok(await readAsset(p,'agent',a.id,catalogScope('agent',null)));
 } finally {await p.$disconnect();await db.drop();}
});
