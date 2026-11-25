import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { createAsset, readAsset, updateAsset } from '../dist/persistence/asset-catalog.js';
import { patchSkillSheetMetadata } from '../dist/persistence/skill-sheet-update.js';

let database, prisma;
before(async () => {
  database = await createTestDatabase('skill_sheet_patch');
  prisma = new PrismaClient({ datasourceUrl: database.url });
  await prisma.domain.createMany({ data: ['field-a', 'field-b'].map(id => ({ id, name: id })) });
  await prisma.region.create({ data: { id: 'region-a', name: '测试区域' } });
});
after(async () => { await prisma?.$disconnect(); await database?.drop(); });
const admin = { id: 'operator', platformRole: 'super_admin', deptIds: [], regionId: null };
const actor = { name: '测试运营' };
async function fixture(id) {
  return prisma.$transaction(tx => createAsset(tx, 'skill', {
    id, name: id, desc: '', category: 'office', command: '/test', author: '旧作者',
    version: '2', connector: '', published: true, invokes: 9, icon: 'fa-cube', tags: [],
    ownerDeptIds: ['field-a'], ownerRegionIds: ['region-a'],
    instructions: '原始正文', usageNotes: '原须知', cases: [{ title: '原始案例' }],
    versions: [{ version: '1', packageBlob: { id: '历史包' } }], packageBlob: { id: '原始包' },
  }));
}
const patch = (id, expectedUpdatedAt, changes, viewer = admin) =>
  prisma.$transaction(tx => patchSkillSheetMetadata(tx, viewer, actor, id, { expectedUpdatedAt, patch: changes }));

test('变更仅落到 Excel 可写字段，保留文件和历史，返回完整 Skill', async () => {
  const original = await fixture('keep-packages');
  const updated = await patch(original.id, null, { author: '新作者', sourceLabel: '创建者提供' });
  const { updatedBy, updatedAt, ...rest } = updated;
  assert.deepEqual(rest, { ...original, author: '新作者', sourceLabel: '创建者提供' });
  assert.ok(updatedAt);
  assert.equal(updatedBy, actor.name);
  const revised = await patch(original.id, updatedAt, { ownerDeptIds: ['field-b', 'field-a'] });
  assert.deepEqual(revised.ownerRegionIds, original.ownerRegionIds);
  assert.deepEqual(revised.ownerDeptIds, ['field-b', 'field-a']);
  await assert.rejects(patch(original.id, revised.updatedAt, { ownerRegionIds: ['未知区域'] }), /unknown_skill_region/);
  assert.equal((await readAsset(prisma, 'skill', original.id)).updatedAt, revised.updatedAt);
});

test('首次更新旧空时间戳也执行原子冲突检查；不能写入包、版本或发布状态', async () => {
  const item = await fixture('race');
  const attempts = await Promise.allSettled([
    patch(item.id, null, { usageNotes: '更新一' }),
    patch(item.id, null, { usageNotes: '更新二' }),
  ]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(r => r.status === 'rejected').reason.getStatus(), 409);
  const winner = attempts.find(r => r.status === 'fulfilled').value;
  for (const data of [{ packageBlob: { id: '替换' } }, { versions: [] }, { instructions: '' }, { published: false }]) {
    await assert.rejects(patch(item.id, winner.updatedAt, data), /invalid_skill_sheet_update/);
  }
  const outsider = { ...admin, platformRole: 'capability_ops' };
  await assert.rejects(patch(item.id, winner.updatedAt, { author: '越权修改' }, outsider), /catalog_not_found/);
  const stored = await readAsset(prisma, 'skill', item.id);
  assert.deepEqual(stored, winner);
});

test('单条维护与表格同时从无时间戳的旧记录保存，只有一方能提交', async () => {
  const original = await fixture('editor-race');
  const attempts = await Promise.allSettled([
    patch(original.id, null, { usageNotes: '表格新须知' }),
    prisma.$transaction(tx => updateAsset(tx, 'skill', original.id, {
      ...original, expectedUpdatedAt: null, updatedAt: '2026-11-24T03:04:05Z', packageBlob: { id: '单条新包' },
    })),
  ]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(r => r.status === 'rejected').reason.getStatus(), 409);
  const stored = await readAsset(prisma, 'skill', original.id);
  const edited = attempts[1].status === 'fulfilled';
  assert.equal(stored.packageBlob.id, edited ? '单条新包' : '原始包');
  assert.equal(stored.usageNotes, edited ? '原须知' : '表格新须知');
});
