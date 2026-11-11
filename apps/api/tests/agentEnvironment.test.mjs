import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { createAsset, updateAsset, readAsset } from '../dist/persistence/asset-catalog.js';

test('Agent 平台和适配流程支持保存、修改、清空和旧数据', async () => {
  const database = await createTestDatabase('agent_environment');
  const db = new PrismaClient({ datasourceUrl: database.url });
  const agent = { id:'environment-test', name:'环境测试', desc:'', category:'office', bizLine:'', homeTag:'', author:'test', published:false, chatId:'test', icon:'fa-robot', color:'rose', skillIds:[] };
  try {
    await db.$transaction(tx => createAsset(tx, 'agent', agent));
    assert.equal((await readAsset(db, 'agent', agent.id)).environment, undefined);
    for (const environment of [
      { platforms:['内网平台','员工助手'], adaptationProcess:'收集需求\n人工审核' },
      { platforms:['自定义平台'], adaptationProcess:'流程已修改' },
      { platforms:[], adaptationProcess:'' },
    ]) {
      await db.$transaction(tx => updateAsset(tx, 'agent', agent.id, { ...agent, environment }));
      assert.deepEqual((await readAsset(db, 'agent', agent.id)).environment, environment);
    }
  } finally { await db.$disconnect(); await database.drop(); }
});
