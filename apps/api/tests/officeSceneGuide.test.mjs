import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
let database, prisma, service;
before(async () => { database = await createTestDatabase('office_scene_guide'); prisma = new PrismaClient({ datasourceUrl: database.url }); service = new PlatformDocsService(prisma, {}); });
after(async () => { await prisma?.$disconnect(); await database?.drop(); });
const entry = { id: 'guide-test', label: '指导', english: '', description: '', icon: 'fa-cube', visible: true, toolIds: [], toolBlurbs: {} };
test('office guidance persists, trims, clears, and accepts legacy entries without URL', async () => {
  const initial = (await service.getDoc('ws-cn-marketing', 'internal-office-scenes')).payload;
  let saved = (await service.putDoc('ws-cn-marketing', 'internal-office-scenes', { expectedRevision: initial.revision, entries: [{ ...entry, guideUrl: ' https://intranet/guide ' }] })).payload;
  assert.equal(saved.entries[0].guideUrl, 'https://intranet/guide');
  assert.equal((await prisma.officeScene.findUnique({ where: { id: entry.id } })).guideUrl, 'https://intranet/guide');
  for (const guideUrl of ['javascript:alert(1)', '//host/path', 'https://user:pass@host', 'https://' + 'a'.repeat(2048)]) {
    await assert.rejects(service.putDoc('ws-cn-marketing', 'internal-office-scenes', { expectedRevision: saved.revision, entries: [{ ...entry, guideUrl }] }), /guideUrl/);
  }
  saved = (await service.putDoc('ws-cn-marketing', 'internal-office-scenes', { expectedRevision: saved.revision, entries: [{ ...entry, guideUrl: '' }] })).payload;
  assert.equal(saved.entries[0].guideUrl, '');
  saved = (await service.putDoc('ws-cn-marketing', 'internal-office-scenes', { expectedRevision: saved.revision, entries: [entry] })).payload;
  assert.equal(saved.entries[0].guideUrl, '');
});
