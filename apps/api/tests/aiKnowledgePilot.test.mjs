import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { AiKnowledgePilotService } = require('../dist/ai-knowledge/ai-knowledge-pilot.service.js');
const { aiContext } = require('../dist/common/ai-usage-context.js');
const { pilotAssetVisible } = require('../dist/ai-knowledge/ai-knowledge.resources.js');

const actor = { key: 'guest:test-a', type: 'guest' };
const candidate = { id: 'skill:real', kind: 'skill', label: '真实能力' };
function fixture(turns = []) {
  const data = new Map(), solutions = [], calls = [];
  const db = {
    appSetting: {
      findUnique: async ({ where }) => structuredClone(data.get(where.settingKey) ?? null),
      create: async ({ data: row }) => { data.set(row.settingKey, { ...row, revision: 0 }); },
      updateMany: async ({ where, data: patch }) => {
        const row = data.get(where.settingKey);
        if (!row || row.revision !== where.revision) return { count: 0 };
        data.set(where.settingKey, { ...row, value: patch.value, revision: row.revision + 1 });
        return { count: 1 };
      },
    },
    aiKnowledgeSolution: { create: async ({ data: row }) => solutions.push(row) },
  };
  db.$transaction = fn => fn(db);
  const service = new AiKnowledgePilotService(db, {}, {}, { operation: (_actor, _id, _purpose, fn) => aiContext.run({}, fn) });
  service.search = async q => { calls.push(q); return [candidate]; };
  service.complete = async () => ({ value: turns.shift(), model: 'test-model' });
  return { service, data, solutions, calls };
}
const reply = (overrides = {}) => ({ reply: '你希望先得到清单还是完整文档？',
  understanding: { task: '写需求文档', goal: '', inputs: '', output: '完整需求文档', constraints: '' },
  needsClarification: false, citedIds: ['skill:real'], ...overrides });

test('访客可读公开能力，归属部门不影响公开可见性；领域/私有仍按权限', () => {
  assert.equal(pilotAssetVisible({ published: true }), true);
  assert.equal(pilotAssetVisible({ published: false }), false);
  assert.equal(pilotAssetVisible({ published: true, visibility: 'private' }), false);
  assert.equal(pilotAssetVisible({ published: true, visibility: 'department' }), false);
  assert.equal(pilotAssetVisible({ published: true, visibility: 'public', ownerDeptIds: ['mkt'] }), true);
  assert.equal(pilotAssetVisible({ published: true, ownerDeptIds: ['mkt'] }), true);
  const org = { published: true, visibility: 'org', ownerDeptIds: ['mkt'] };
  assert.equal(pilotAssetVisible(org), false);
  assert.equal(pilotAssetVisible(org, { userId: 'a', deptIds: ['mkt'] }), true);
  assert.equal(pilotAssetVisible(org, { userId: 'b', deptIds: ['rd'] }), false);
  assert.equal(pilotAssetVisible({ ...org, visibility: 'private', publisherUserId: 'a' }, { userId: 'a' }), true);
});

test('无角色和非关键字段时可以形成方向，历史按访问者隔离', async () => {
  const { service } = fixture([reply()]);
  const s = await service.message(actor, '帮我整理需求文档');
  assert.equal(s.needsClarification, false);
  assert.equal(s.messages.at(-1).sources[0].id, candidate.id);
  await assert.rejects(service.read({ key: 'guest:other', type: 'guest' }, s.id), /对话不存在/);
  assert.equal((await service.read(actor, s.id)).id, s.id);
});
test('引用不存在的资源只修复一次，失败不保存假回答', async () => {
  const { service, data } = fixture([reply({ citedIds: ['invented'] }), reply({ citedIds: ['invented'] })]);
  await assert.rejects(service.message(actor, '帮我整理需求文档'), /不存在的资源/);
  assert.equal(data.size, 0);
});
test('引用修复成功后仅保存有效来源', async () => {
  const { service } = fixture([reply({ citedIds: ['invented'] }), reply()]);
  const s = await service.message(actor, '帮我整理需求文档');
  assert.deepEqual(s.messages.at(-1).sources.map(s => s.id), ['skill:real']);
});

test('问用法允许分层说明，不再被短对话上限截断', async () => {
  const text = '先准备文档，再核对检查范围。'.repeat(60);
  const { service } = fixture([reply({ reply: text })]);
  const s = await service.message(actor, '这个文档解读Agent怎么用？');
  assert.equal(s.messages.at(-1).replyMode, 'usage');
  assert.equal(s.messages.at(-1).text, text);
});

test('多问题盘问修复后仍未通过时不保存回复', async () => {
  const invalid = reply({ reply: '你是什么角色？你有什么材料？' });
  const { service, data } = fixture([invalid, invalid]);
  await assert.rejects(service.message(actor, '帮我找方案'), /表达规则/);
  assert.equal(data.size, 0);
});

test('表达修复成功，保存修复后的单个关键追问', async () => {
  const { service } = fixture([reply({ reply: '你是谁？想做什么？' }), reply()]);
  const s = await service.message(actor, '帮我找方案');
  assert.equal(s.messages.at(-1).text, reply().reply);
});
test('新一轮需求修正进入检索，且不会改写上一轮消息', async () => {
  const { service, calls } = fixture([reply(), reply({ reply: '好的，只考虑内部资料处理。' })]);
  const first = await service.message(actor, '帮我整理需求文档');
  const next = await service.message(actor, '只允许用内部工具', first.id);
  assert.match(calls.at(-1), /只允许用内部工具/);
  assert.equal(first.messages.length, 2);
  assert.equal(next.messages.length, 4);
});
test('明确确认后才生成，方案可重读，重复生成不重复保存', async () => {
  const plan = { title: '需求文档方案', summary: '使用真实能力整理需求',
    steps: [{ title: '梳理需求', input: '访谈', output: '需求文档', humanCheck: '核对事实', resourceIds: ['skill:real'] }],
    limitations: ['仍需人工核对'], citedIds: ['skill:real'] };
  const { service, solutions } = fixture([reply(), plan]);
  const s = await service.message(actor, '帮我整理需求文档');
  await assert.rejects(service.generate(actor, s.id, false), /请先确认/);
  const saved = await service.generate(actor, s.id, true);
  assert.equal(saved.plan.model, 'test-model');
  assert.equal(solutions.length, 1);
  assert.equal((await service.read(actor, s.id)).plan.id, saved.plan.id);
  assert.equal((await service.generate(actor, s.id, true)).plan.id, saved.plan.id);
  assert.equal(solutions.length, 1);
});
