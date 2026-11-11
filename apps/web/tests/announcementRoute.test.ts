import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppRoute, parseAppRoute } from '../src/domain/appRoute.ts';

test('公告分享保留公告 ID 和分享来源，特殊字符可以往返', () => {
  const route = buildAppRoute({ view: 'messages', announcement: '公告/a b', source: 'share' });
  const parsed = parseAppRoute(route);
  assert.equal(parsed.view, 'messages');
  assert.equal(parsed.announcement, '公告/a b');
  assert.equal(parsed.source, 'share');
  assert.equal(buildAppRoute(parsed), route);
});

test('系统消息入口不携带分享来源，其他页面不继承公告参数', () => {
  assert.equal(buildAppRoute({ view: 'messages' }), '#/messages');
  assert.equal(buildAppRoute({ view: 'messages', announcement: 'a', source: 'system' }), '#/messages?announcement=a');
  assert.equal(parseAppRoute('#/home?announcement=a&source=share').announcement, undefined);
});
