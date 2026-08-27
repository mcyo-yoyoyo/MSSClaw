import assert from 'node:assert/strict';
import test from 'node:test';
import {
  orderExternalFeaturedItems,
  splitExternalFeaturedItemsByRegion,
} from '../src/domain/externalFeaturedOrder.ts';

type Card = {
  id: string;
  externalSortOrder?: number;
  sourceOrder?: number;
};

const ids = (cards: readonly Card[]) => cards.map((card) => card.id);

test('pinned tools lead in configured pin order', () => {
  const cards: Card[] = [
    { id: 'alpha', externalSortOrder: 1 },
    { id: 'bravo', externalSortOrder: 2 },
    { id: 'charlie', externalSortOrder: 3 },
  ];

  assert.deepEqual(
    ids(orderExternalFeaturedItems(cards, ['charlie', 'alpha'])),
    ['charlie', 'alpha', 'bravo'],
  );
});

test('unpinned tools follow external list order with a stable fallback', () => {
  const cards: Card[] = [
    { id: 'missing-order-a' },
    { id: 'third', externalSortOrder: 30 },
    { id: 'first', externalSortOrder: 10 },
    { id: 'missing-order-b' },
    { id: 'second', externalSortOrder: 20 },
  ];

  assert.deepEqual(
    ids(orderExternalFeaturedItems(cards, [])),
    ['first', 'second', 'third', 'missing-order-a', 'missing-order-b'],
  );
});

test('category order can override the global external list order', () => {
  const cards: Card[] = [
    { id: 'global-first', externalSortOrder: 1, sourceOrder: 20 },
    { id: 'category-first', externalSortOrder: 20, sourceOrder: 1 },
  ];

  assert.deepEqual(
    ids(orderExternalFeaturedItems(cards, [], (card) => card.sourceOrder)),
    ['category-first', 'global-first'],
  );
});

test('temporary unpublish does not consume pin configuration', () => {
  const pinnedIds = Object.freeze(['temporarily-hidden', 'visible-pin']);
  const visibleCards: Card[] = [
    { id: 'visible-pin', externalSortOrder: 20 },
    { id: 'regular', externalSortOrder: 10 },
  ];

  assert.deepEqual(
    ids(orderExternalFeaturedItems(visibleCards, pinnedIds)),
    ['visible-pin', 'regular'],
  );
  assert.deepEqual(pinnedIds, ['temporarily-hidden', 'visible-pin']);

  const republishedCards: Card[] = [
    ...visibleCards,
    { id: 'temporarily-hidden', externalSortOrder: 30 },
  ];
  assert.deepEqual(
    ids(orderExternalFeaturedItems(republishedCards, pinnedIds)),
    ['temporarily-hidden', 'visible-pin', 'regular'],
  );
});

test('sorting does not mutate cards or pins', () => {
  const cards = Object.freeze<Card[]>([
    { id: 'second', externalSortOrder: 2 },
    { id: 'first', externalSortOrder: 1 },
  ]);
  const pins = Object.freeze(['second']);

  assert.deepEqual(ids(orderExternalFeaturedItems(cards, pins)), ['second', 'first']);
  assert.deepEqual(ids(cards), ['second', 'first']);
  assert.deepEqual(pins, ['second']);
});

test('regional featured limit returns overflow pins to the rest list', () => {
  const cards = [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `overseas-${index + 1}`,
      featured: true,
      region: 'overseas' as const,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `domestic-${index + 1}`,
      featured: true,
      region: 'domestic' as const,
    })),
    { id: 'regular', featured: false, region: 'domestic' as const },
  ];

  const result = splitExternalFeaturedItemsByRegion(cards, () => true);

  assert.equal(result.overseas.length, 4);
  assert.equal(result.domestic.length, 3);
  assert.deepEqual(
    result.rest.map((card) => card.id),
    ['overseas-5', 'regular'],
  );
  assert.equal(result.featured.length + result.rest.length, cards.length);
});
