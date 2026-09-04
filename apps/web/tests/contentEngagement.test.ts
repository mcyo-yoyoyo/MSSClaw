import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_HUB_RANK_TABS,
  emptyEngagement,
  SHELF_RANK_TABS,
  sortByRankMode,
} from '../src/domain/contentEngagement.ts';

const engagement = (patch: Partial<ReturnType<typeof emptyEngagement>>) => ({
  ...emptyEngagement('test'),
  ...patch,
});

test('三类用户货架统一以后台顺序为默认排序项', () => {
  assert.deepEqual(
    [SHELF_RANK_TABS[0]?.id, SHELF_RANK_TABS[0]?.label],
    ['excel_order', '排序'],
  );
  assert.deepEqual(
    [AGENT_HUB_RANK_TABS[0]?.id, AGENT_HUB_RANK_TABS[0]?.label],
    ['excel_order', '排序'],
  );
});

test('rank direction keeps list order ascending or descending', () => {
  const cards = [
    { id: 'second', sourceOrder: 2 },
    { id: 'first', sourceOrder: 1 },
    { id: 'unknown' },
  ];
  const get = () => engagement({});

  assert.deepEqual(
    sortByRankMode(cards, 'excel_order', get).map((card) => card.id),
    ['first', 'second', 'unknown'],
  );
  assert.deepEqual(
    sortByRankMode(cards, 'excel_order', get, 'desc').map((card) => card.id),
    ['second', 'first', 'unknown'],
  );
});

test('engagement modes default to descending and support ascending', () => {
  const cards = [{ id: 'low' }, { id: 'high' }];
  const get = (id: string) => engagement({ views: id === 'high' ? 9 : 2 });

  assert.deepEqual(
    sortByRankMode(cards, 'most_viewed', get).map((card) => card.id),
    ['high', 'low'],
  );
  assert.deepEqual(
    sortByRankMode(cards, 'most_viewed', get, 'asc').map((card) => card.id),
    ['low', 'high'],
  );
});
