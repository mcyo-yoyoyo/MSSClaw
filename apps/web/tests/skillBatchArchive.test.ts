import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';
import { zipSync, strToU8, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import type { PrototypeSkillSeed } from '../src/domain/prototype/types.ts';
let vite: ViteDevServer;
let api: typeof import('../src/domain/skillBatchArchive.ts');
before(async () => {
  vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  api = await vite.ssrLoadModule('/src/domain/skillBatchArchive.ts') as typeof api;
});
after(async () => { await vite.close(); });
const skill: PrototypeSkillSeed = { downloadUrl: 'https://intranet/skill-download', id: 'skill-roundtrip', name: '测试技能', desc: '分析数据', command: '/test', version: '2.0', category: 'office', author: 'Tester', connector: '', published: true, callable: true, visibility: 'public', invokes: 25, icon: 'fa-cube', tags: ['分析'], instructions: '# 测试\n\n执行脚本', usageNotes: '准备输入文件', cases: [{ title: '案例' }] };
async function changedSheet(bytes: Uint8Array, change: (rows: Record<string, unknown>[]) => void) {
  const files = await api.readArchive(bytes);
  const book = XLSX.read(files['skills.xlsx'], { type: 'array' });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets.Skills);
  change(rows); book.Sheets.Skills = XLSX.utils.json_to_sheet(rows);
  files['skills.xlsx'] = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  return api.zipFiles(files);
}
test('text-only skill round trips metadata and creates draft, never inherits publish or usage', async () => {
  const bytes = await api.buildSkillBatch([skill], async () => { throw new Error('must not fetch'); });
  const rows = await api.parseSkillBatch(bytes);
  assert.equal(rows[0].error, undefined);
  assert.equal(rows[0].skill?.name, skill.name);
  assert.equal(rows[0].skill?.version, '2.0');
  assert.equal(rows[0].skill?.downloadUrl, skill.downloadUrl);
  assert.equal(rows[0].skill?.instructions, skill.instructions);
  assert.equal(rows[0].skill?.usageNotes, skill.usageNotes);
  assert.deepEqual(rows[0].skill?.cases, skill.cases);
  assert.equal(rows[0].skill?.published, false);
  assert.equal(rows[0].skill?.callable, false);
  assert.equal(rows[0].skill?.invokes, 0);
  const files = await api.readArchive(bytes);
  assert.deepEqual([...new Set(Object.keys(files).map(p => p.split('/')[0]))].sort(), ['skills', 'skills.xlsx']);
});
test('original package preserves binary and script bytes and uses SKILL.md as instructions', async () => {
  const binary = new Uint8Array([0, 255, 1, 128]);
  const original = zipSync({ '原包/SKILL.md': strToU8('---\nname: test\n---\n# 原始正文'), '原包/scripts/run.py': strToU8('print("ok")'), '原包/assets/data.bin': binary });
  const bytes = await api.buildSkillBatch([{ ...skill, packageBlob: { id: 'blob', name: 'skill.zip', url: '/protected', size: original.length, mimeType: 'application/zip', uploadedAt: '2026-11-10' } }], async () => original);
  const [row] = await api.parseSkillBatch(bytes);
  assert.equal(row.error, undefined);
  assert.deepEqual(row.files?.['assets/data.bin'], binary);
  assert.equal(strFromU8(row.files!['scripts/run.py']), 'print("ok")');
  assert.equal(row.skill?.instructions, '# 原始正文');
});
test('Excel edits take precedence; duplicate IDs and unknown regions are reported per row', async () => {
  const bytes = await api.buildSkillBatch([skill], async () => new Uint8Array());
  let rows = await api.parseSkillBatch(await changedSheet(bytes, rows => { rows[0]['名称'] = '新名称'; rows[0]['版本'] = '3.0'; }));
  assert.equal(rows[0].skill?.name, '新名称'); assert.equal(rows[0].skill?.version, '3.0');
  rows = await api.parseSkillBatch(await changedSheet(bytes, rows => { rows.push({ ...rows[0] }); }));
  assert.ok(rows.every(row => row.error?.includes('ID 重复')));
  rows = await api.parseSkillBatch(await changedSheet(bytes, rows => { rows[0]['应用区域编码'] = 'unknown-region'; }));
  assert.match(rows[0].error!, /未知应用区域/);
});
test('missing SKILL.md and unsafe ZIP paths cannot be imported', async () => {
  const bytes = await api.buildSkillBatch([skill], async () => new Uint8Array());
  const files = await api.readArchive(bytes);
  delete files['skills/skill-roundtrip/SKILL.md'];
  assert.match((await api.parseSkillBatch(await api.zipFiles(files)))[0].error!, /缺少 SKILL.md/);
  await assert.rejects(api.parseSkillBatch(zipSync({ '../evil': strToU8('oops') })), /路径|ZIP/);
});
test('package fetch failure fails export instead of silently replacing scripts with generated text', async () => {
  await assert.rejects(api.buildSkillBatch([{ ...skill, packageBlob: { id: 'x', name: 'x.zip', url: '/missing', size: 1, mimeType: 'application/zip', uploadedAt: '' } }], async () => { throw new Error('HTTP 404'); }), /HTTP 404/);
});
