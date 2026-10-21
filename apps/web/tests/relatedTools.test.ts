import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrototypeToolSeed } from '../src/domain/prototype/types.ts';
import { relatedTools } from '../src/domain/relatedTools.ts';

const tool = (id: string, extra: Partial<PrototypeToolSeed> = {}) =>
  ({ id, name: id, desc: '', category: 'external', author: 't', published: true, invokes: 0, icon: 'fa-cube', tags: [], marketShelf: 'external', ...extra }) as PrototypeToolSeed;

test('相关推荐：只取同货架、上架、可见的其他工具；类型重合多的在前，其次按热度', () => {
  const current = tool('cur', { toolTypeIds: ['doc', 'write'] });
  const all = [
    current,
    tool('hot-no-overlap', { invokes: 99 }),
    tool('one-overlap', { toolTypeIds: ['doc'], invokes: 1 }),
    tool('two-overlap', { toolTypeIds: ['doc', 'write'] }),
    tool('other-shelf', { marketShelf: 'internal', toolTypeIds: ['doc', 'write'] }),
    tool('unpublished', { published: false, toolTypeIds: ['doc'] }),
    tool('hidden', { toolTypeIds: ['doc'] }),
  ];
  const ids = relatedTools(current, all, (t) => t.id !== 'hidden').map((t) => t.id);
  assert.deepEqual(ids, ['two-overlap', 'one-overlap', 'hot-no-overlap']);
  assert.equal(relatedTools(current, all, () => true, 1).length, 1);
});

test('当前工具不在任何货架时不推荐', () => {
  const current = tool('cur', { marketShelf: 'none' });
  assert.deepEqual(relatedTools(current, [current, tool('a', { marketShelf: 'none' })], () => true), []);
});
