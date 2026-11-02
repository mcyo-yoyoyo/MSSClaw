import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import * as XLSX from 'xlsx';
import { buildMemberTemplate, IMPORT_COLUMNS } from '../src/features/org/memberImportSheet.ts';

const regions = [
  { id: 'apac', name: '亚太', enabled: true, sort: 2 },
  { id: 'eu', name: '欧洲', enabled: true, sort: 1 },
  { id: 'old', name: '已停用区域', enabled: false, sort: 0 },
];
const domains = [
  { id: 'mkt', name: 'MKT', enabled: true, sort: 1 },
  { id: 'quality', name: '质运', enabled: true, sort: 0 },
];

test('成员模板去掉角色和初始密码，区域和领域按下拉引用当前数据', () => {
  const bytes = buildMemberTemplate({ regions, domains });
  const book = XLSX.read(bytes, { type: 'array' });
  assert.deepEqual(book.SheetNames.slice(0, 2), ['成员', '填写说明']);
  assert.equal(book.Workbook?.Sheets?.[2]?.Hidden, 1);

  const grid = XLSX.utils.sheet_to_json<string[]>(book.Sheets['成员'], { header: 1, defval: '' });
  assert.deepEqual(grid[0], IMPORT_COLUMNS.map((column) => column.header));
  assert.deepEqual(grid[0], ['姓名', '邮箱', '区域', '领域']);
  assert.equal(grid[1]?.[2], '欧洲');
  assert.equal(grid[1]?.[3], '质运');
  assert.equal(JSON.stringify(grid).includes('角色'), false);
  assert.equal(JSON.stringify(grid).includes('初始密码'), false);

  const files = unzipSync(bytes);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /type="list"/);
  assert.match(sheet, /sqref="C2:C501"/);
  assert.match(sheet, /sqref="D2:D501"/);
  assert.match(sheet, /'选项'!\$A\$2:\$A\$3/);
  assert.match(sheet, /'选项'!\$B\$2:\$B\$3/);
  assert.doesNotMatch(sheet, /已停用区域/);

  const guide = XLSX.utils.sheet_to_json<string[]>(book.Sheets['填写说明'], { header: 1, defval: '' });
  const flat = guide.flat().join('\n');
  assert.match(flat, /欧洲/);
  assert.match(flat, /亚太/);
  assert.match(flat, /质运/);
  assert.match(flat, /MKT/);
  assert.equal(flat.includes('已停用区域'), false);
});
