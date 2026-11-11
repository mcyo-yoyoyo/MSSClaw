import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { createAsset, updateAsset, readAsset } from '../dist/persistence/asset-catalog.js';
let database, prisma;
before(async () => { database = await createTestDatabase('skill_download_url'); prisma = new PrismaClient({ datasourceUrl: database.url }); });
after(async () => { await prisma?.$disconnect(); await database?.drop(); });
const skill = { id: 'download-test', name: 'Download', desc: '', category: 'office', command: '/download', author: 'test', version: '1', connector: '', published: false, icon: 'fa-cube', tags: [] };
test('download URL survives save/read, rejects unsafe URL, clears, and accepts legacy skills', async () => {
  const create = raw => prisma.$transaction(tx => createAsset(tx, 'skill', raw));
  const update = raw => prisma.$transaction(tx => updateAsset(tx, 'skill', skill.id, raw));
  await create({ ...skill, downloadUrl: ' https://intranet/download ' });
  assert.equal((await readAsset(prisma, 'skill', skill.id)).downloadUrl, 'https://intranet/download');
  for (const downloadUrl of ['javascript:alert(1)', '//host/path', 'https://user:pass@host', 'https://' + 'a'.repeat(2048)]) {
    await assert.rejects(update({ ...skill, downloadUrl }), /downloadUrl/);
  }
  assert.equal((await readAsset(prisma, 'skill', skill.id)).downloadUrl, 'https://intranet/download');
  await update({ ...skill, downloadUrl: '' });
  assert.equal((await readAsset(prisma, 'skill', skill.id)).downloadUrl, undefined);
  await update(skill);
  assert.equal((await readAsset(prisma, 'skill', skill.id)).downloadUrl, undefined);
});
