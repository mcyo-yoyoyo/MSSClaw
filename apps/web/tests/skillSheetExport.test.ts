import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { unzipSync, zipSync } from 'fflate';
import * as XLSX from 'xlsx';
import { createServer, type ViteDevServer } from 'vite';
import type { PrototypeSkillSeed } from '../src/domain/prototype/types.ts';

let vite: ViteDevServer;
let build: typeof import('../src/domain/skillExport.ts').buildSkillsExportArchive;
before(async () => {
  vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  ({ buildSkillsExportArchive: build } = await vite.ssrLoadModule('/src/domain/skillExport.ts') as typeof import('../src/domain/skillExport.ts'));
});
after(() => vite.close());

const skill: PrototypeSkillSeed = {
  id: 'en-test', name: 'Sales', nameZh: '销售分析', desc: '描述', command: '/sales',
  author: '王明 301', category: 'office', version: '1.0', connector: '',
  published: false, callable: true, invokes: 20, icon: '', tags: [], sourceLabel: '创建者提供',
};

test('明细按模板顺序导出 35 列，统计取实际值，文件名对应显示名称', async t => {
  const original = zipSync({ 'assets/sample.bin': new Uint8Array([142, 0, 5, 255]) });
  const archived = { ...skill, packageBlob: { id: 'blob', url: '/original', name: 'vendor.zip', size: original.length, uploadedAt: '' } };
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array(original)));
  const zip = unzipSync(await build([archived, { ...skill, id: 'other' }], {
    'en-test': { likes: 1, dislikes: 0, downloads: 10, views: 20, downloads30d: 3, likeUsers: ['李明 305'] },
  }));
  assert.deepEqual(zip['skills/销售分析.zip'], original);
  const generated = unzipSync(zip['skills/2/销售分析.zip']);
  assert.ok(Object.keys(generated).some(path => path.endsWith('/SKILL.md')));
  const book = XLSX.read(zip['Skill明细表.xlsx'], { type: 'array' });
  const sheet = book.Sheets['技能明细'];
  const [headers] = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  assert.equal(headers.join('|'), 'SkillID|Skill名称|来源|创建者|所属部门预留|匹配流程预留|领域信息|区域信息|业务场景|英文名称|调用指令|可见范围|是否可调用|是否精选推荐|运营标签|搜索关键词|创建时间|更新者|更新时间|最近更新日期|历史版本更新记录|具备执行正文|使用须知摘要|案例条数|演示调用次数|页面访问量|Skill下载总量|近30天下载总量|点赞量|点赞用户名工号|点踩量|点踩用户名工号|调用总次数预留|Token消耗总量预留|近30天消耗总量预留');
  const [row, unknown] = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });
  assert.equal(row.Skill名称, '销售分析');
  assert.equal(row.来源, '创建者提供');
  assert.equal(row.是否可调用, '是');
  assert.equal(row.近30天下载总量, 3);
  assert.equal(row.点赞用户名工号, '李明 305');
  assert.equal(row.点踩量, 0);
  assert.equal(unknown.点踩量, '');
});
