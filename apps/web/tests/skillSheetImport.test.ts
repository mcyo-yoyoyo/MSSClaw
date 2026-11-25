import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import * as XLSX from 'xlsx';
import { createServer, type ViteDevServer } from 'vite';
import type { PrototypeSkillSeed } from '../src/domain/prototype/types.ts';

let vite: ViteDevServer;
let api: typeof import('../src/domain/skillSheetImport.ts');
let columns: typeof import('../src/domain/skillSheetColumns.ts');
before(async () => {
  vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  api = await vite.ssrLoadModule('/src/domain/skillSheetImport.ts') as typeof api;
  columns = await vite.ssrLoadModule('/src/domain/skillSheetColumns.ts') as typeof columns;
});
after(() => vite.close());

function sheet(rows: unknown[][], bookType: 'xls' | 'xlsx' = 'xlsx') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType }));
}
const old: PrototypeSkillSeed = {
  id: 'skill-data-analysis', name: 'Analyze', desc: '正文说明', category: 'office', command: '/analyze',
  author: 'Imported', publisher: '小芳 00123', version: '3', connector: '', published: true,
  invokes: 10, icon: 'fa-star', tags: ['运营'], instructions: '# 原包内容', usageNotes: '甲'.repeat(200),
  packageBlob: { id: 'blob', url: '/包', name: 'current.zip', size: 2, mimeType: 'application/zip', uploadedAt: '' },
  versions: [{ version: '2' }], ownerDeptIds: ['gtm', 'mkt'], ownerRegionId: 'apac', ownerRegionIds: ['apac', 'mea'],
};

test('真实 XLS 格式支持标题偏移与模板说明；仅按业务行新增', async () => {
  const rows = await api.parseSkillSheet(sheet([
    [], [], [], ['变更：'],
    ['SkillID', 'Skill名称', '来源', '创建者', '业务场景', '创建时间'],
    ['', '', '创建者提供', '姓名 工号', '是否方便改中文', '能否记录到年月日时分秒？'],
    ['', '', '外部平台（GitHub等）'], [],
    ['', 'XX', '内部', '员工助手'], ['', '', '外部', 'GitHub（链接）'],
    [old.id, '新技能', '外部平台（GitHub等）', '李明 009', '数据分析'],
  ], 'xls'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].row, 11);
  const one = api.planSkillSheetRow(rows[0], [old]);
  assert.equal(one.action, 'create');
  assert.equal(one.skill?.author, '李明 009');
  assert.equal(one.skill?.sourceType, 'external');
  assert.equal(one.skill?.sourceLabel, '外部平台（GitHub等）');
  assert.equal(one.skill?.businessScenarioId, 'S8');
  assert.equal(one.skill?.published, false);
  assert.equal(one.skill?.packageBlob, undefined);
  assert.equal(one.skill?.id, '');
  const created = { ...one.skill!, id: 'server-assigned-id' };
  assert.equal(api.planSkillSheetRow(rows[0], [old, created]).action, 'unchanged');
  const renamed = { ...created, name: '后来改名', nameZh: '后来改名' };
  assert.equal(api.planSkillSheetRow(rows[0], [old, renamed]).action, 'create');
});

test('原样回导不写入；保留旧种子的显示名、默认开关、多组织、完整须知', async () => {
  const metadata = columns.skillSheetMetadata(old);
  const [row] = await api.parseSkillSheet(sheet([Object.keys(metadata), Object.values(metadata)]));
  const plan = api.planSkillSheetRow(row, [old]);
  assert.equal(plan.action, 'unchanged');
  assert.equal(plan.skill, old);
  assert.deepEqual(plan.changes, []);
});

test('来源为空时新建不分类、导出留空，表格更新保留已有分类', async () => {
  const [row] = await api.parseSkillSheet(sheet([['Skill名称', '来源'], ['可选来源', '']]));
  const draft = api.planSkillSheetRow(row, []).skill!;
  assert.equal(draft.sourceType, undefined);
  assert.equal(columns.skillSheetMetadata(draft).来源, '');
  for (const sourceType of ['internal', 'external'] as const) {
    const existing = { ...draft, id: 'existing', sourceType };
    assert.equal(api.planSkillSheetRow(row, [existing]).action, 'unchanged');
    assert.equal(columns.skillSheetMetadata(existing).来源, sourceType === 'internal' ? '内部平台' : '外部平台');
  }
});

test('按名称更新有差异的可写字段，保留文件、审计和统计', async () => {
  const [row] = await api.parseSkillSheet(sheet([
    ['SkillID', 'Skill名称', '运营标签', '是否可调用', '搜索关键词', '使用须知摘要', '演示调用次数', '更新时间', '创建者'],
    ['错误ID', '  多源数据分析 ', '自动化，脚本', 0, '关键词', '', 999, '2099', ''],
  ]));
  const plan = api.planSkillSheetRow(row, [old]);
  assert.equal(plan.action, 'update');
  assert.deepEqual(plan.changes, ['运营标签', '是否可调用', '搜索关键词']);
  assert.deepEqual(api.skillSheetUpdatePatch(plan), { tags: ['自动化', '脚本'], callable: false, searchKeywords: ['关键词'] });
  assert.deepEqual(plan.skill, { ...old, tags: ['自动化', '脚本'], callable: false, searchKeywords: ['关键词'] });
  assert.equal(api.planSkillSheetRow(row, [plan.skill!]).action, 'unchanged');
});

test('同表重名、目录重名、缺名与错误布尔值均指出对应行', async () => {
  const rows = await api.parseSkillSheet(sheet([
    ['Skill名称', '是否可调用'], ['重复', '是'], [' 重复 ', '否'], ['', '否'], ['正常名', '也许'], ['多源数据分析', '是'],
  ]));
  assert.deepEqual(rows.slice(0, 3).map(row => [row.row, row.error]), [
    [2, 'Excel 中 Skill名称重复'], [3, 'Excel 中 Skill名称重复'], [4, '缺少 Skill名称'],
  ]);
  assert.match(api.planSkillSheetRow(rows[3], []).error!, /是否可调用/);
  assert.match(api.planSkillSheetRow(rows[4], [old, { ...old, id: 'second', nameZh: '多源数据分析' }]).error!, /多个同名/);
});

test('非法文件、缺失名称列和空模板拒绝导入', async () => {
  await assert.rejects(api.parseSkillSheet(new Uint8Array([10, 20])), /Excel/);
  await assert.rejects(api.parseSkillSheet(sheet([['乱填']])), /Skill名称/);
  await assert.rejects(api.parseSkillSheet(sheet([['Skill名称']])), /没有待导入/);
});
