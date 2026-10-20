import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppRoute, DETAIL_VIEW, parseAppRoute } from '../src/domain/appRoute.ts';
import { assetShareText, oneLineBrief } from '../src/domain/assetShare.ts';

test('资产详情地址：解析与生成互逆，类型不认识时不带类型', () => {
  const route = parseAppRoute('#/detail?type=skill&id=skill-submit-1787192998215');
  assert.deepEqual(route, { view: DETAIL_VIEW, type: 'skill', id: 'skill-submit-1787192998215' });
  assert.equal(buildAppRoute(route), '#/detail?type=skill&id=skill-submit-1787192998215');
  assert.deepEqual(parseAppRoute('#/detail?type=prompt&id=p1'), { view: DETAIL_VIEW, type: undefined, id: 'p1' });
  assert.equal(buildAppRoute({ view: DETAIL_VIEW, type: 'case', id: 'a b' }), '#/detail?type=case&id=a+b');
});

test('旧链接继续有效：工具深链和案例页（含旧的 workspaceId 参数）都落到详情页', () => {
  assert.equal(buildAppRoute(parseAppRoute('#/market-tool?id=tool-ext-chatgpt')), '#/detail?type=tool&id=tool-ext-chatgpt');
  assert.equal(
    buildAppRoute(parseAppRoute('#/case-insight?workspaceId=ws-cn-marketing&id=6f1c2d3e')),
    '#/detail?type=case&id=6f1c2d3e',
  );
});

test('其它路由不受影响', () => {
  assert.deepEqual(parseAppRoute('#/task?chat=c1'), { view: 'task', chat: 'c1' });
  assert.equal(buildAppRoute({ view: 'market-projects' }), '#/market-projects');
  assert.deepEqual(parseAppRoute('#/not-a-view'), { view: 'home', chat: undefined });
});

test('分享文案：【平台名】标题｜第一句简介，换行跟链接；简介过长截断，没有简介不带分隔符', () => {
  assert.equal(oneLineBrief('把会议录音整理成纪要。支持多语种！'), '把会议录音整理成纪要');
  assert.equal(oneLineBrief('长'.repeat(80)), `${'长'.repeat(60)}…`);
  assert.equal(
    assetShareText(' 会议纪要助手 ', '把会议录音整理成纪要。', 'http://hub/#/detail?type=tool&id=t1'),
    '【MSS AI提效平台】会议纪要助手｜把会议录音整理成纪要\nhttp://hub/#/detail?type=tool&id=t1',
  );
  assert.equal(assetShareText('案例', '', 'u'), '【MSS AI提效平台】案例\nu');
});
