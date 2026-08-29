import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addExternalToolCategoryFeatured,
  cloneExternalToolLayoutDocument,
  createEmptyExternalToolLayoutDocument,
  externalToolLayoutsEqual,
  insertExternalToolIdBefore,
  mergeExternalToolLayoutVisibleAndParkedIds,
  orderExternalToolsByLayoutIds,
  parseExternalToolLayoutDocument,
  removeExternalToolCategoryFeatured,
  reorderExternalToolCategoryFeatured,
  reorderExternalToolCategoryList,
  reorderExternalToolLayoutAllList,
  setExternalToolCategoryFeatured,
  setExternalToolCategoryList,
  setExternalToolLayoutAllList,
  toExternalToolLayoutSavePayload,
  type ExternalToolLayoutAllListKey,
  type ExternalToolCategoryListKey,
} from '../src/domain/externalToolLayout.ts';

const ALL_KEYS: ExternalToolLayoutAllListKey[] = [
  'overseasFeaturedIds',
  'domesticFeaturedIds',
  'overseasMoreOrderIds',
  'domesticMoreOrderIds',
];

const CATEGORY_KEYS: ExternalToolCategoryListKey[] = [
  'overseasFeaturedIds',
  'domesticFeaturedIds',
  'overseasMoreOrderIds',
  'domesticMoreOrderIds',
];

test('empty layout matches the persisted document contract', () => {
  assert.deepEqual(createEmptyExternalToolLayoutDocument(), {
    version: 1,
    revision: 0,
    all: {
      overseasFeaturedIds: [],
      domesticFeaturedIds: [],
      overseasMoreOrderIds: [],
      domesticMoreOrderIds: [],
    },
    categories: {},
  });
});

test('remote parsing trims and de-duplicates IDs without inventing fallback ranks', () => {
  const parsed = parseExternalToolLayoutDocument({
    version: 1,
    revision: 7,
    all: {
      overseasFeaturedIds: [' chatgpt ', 'claude', 'chatgpt'],
      domesticFeaturedIds: ['doubao'],
      overseasMoreOrderIds: ['chatgpt', 'perplexity'],
      domesticMoreOrderIds: ['doubao', 'kimi', 'kimi'],
    },
    categories: {
      general: {
        overseasFeaturedIds: ['claude', ' chatgpt '],
        domesticFeaturedIds: ['doubao', 'claude'],
        overseasMoreOrderIds: ['chatgpt', 'perplexity'],
        domesticMoreOrderIds: ['doubao', 'kimi'],
      },
      // Backward compatibility for snapshots written before domestic support.
      search: { overseasFeaturedIds: [] },
    },
  });

  assert.deepEqual(parsed.all.overseasFeaturedIds, ['chatgpt', 'claude']);
  assert.deepEqual(parsed.all.overseasMoreOrderIds, ['perplexity']);
  assert.deepEqual(parsed.all.domesticMoreOrderIds, ['kimi']);
  assert.deepEqual(parsed.categories.general?.overseasFeaturedIds, ['claude', 'chatgpt']);
  assert.deepEqual(parsed.categories.general?.domesticFeaturedIds, ['doubao']);
  assert.deepEqual(parsed.categories.general?.overseasMoreOrderIds, ['perplexity']);
  assert.deepEqual(parsed.categories.general?.domesticMoreOrderIds, ['kimi']);
  assert.deepEqual(parsed.categories.search?.overseasFeaturedIds, []);
  assert.deepEqual(parsed.categories.search?.domesticFeaturedIds, []);
  assert.deepEqual(parsed.categories.search?.overseasMoreOrderIds, []);
  assert.deepEqual(parsed.categories.search?.domesticMoreOrderIds, []);
});

test('remote parsing de-duplicates all four lists by canonical cross-region priority', () => {
  const parsed = parseExternalToolLayoutDocument({
    version: 1,
    revision: 1,
    all: {
      overseasFeaturedIds: ['shared', 'overseas-featured'],
      domesticFeaturedIds: ['shared', 'domestic-featured'],
      overseasMoreOrderIds: [
        'domestic-featured',
        'shared',
        'overseas-more',
      ],
      domesticMoreOrderIds: [
        'overseas-featured',
        'domestic-featured',
        'domestic-more',
      ],
    },
    categories: {},
  });

  assert.deepEqual(parsed.all, {
    overseasFeaturedIds: ['shared', 'overseas-featured'],
    domesticFeaturedIds: ['domestic-featured'],
    overseasMoreOrderIds: ['overseas-more'],
    domesticMoreOrderIds: ['domestic-more'],
  });
});

test('invalid formal snapshots fail instead of masquerading as empty database data', () => {
  assert.throws(
    () =>
      parseExternalToolLayoutDocument({
        version: 1,
        revision: 0,
        all: {},
        categories: {},
      }),
    /invalid_external_tool_layout:all\.overseasFeaturedIds/,
  );
  assert.throws(
    () =>
      parseExternalToolLayoutDocument({
        version: 2,
        revision: 0,
        all: {},
        categories: {},
      }),
    /invalid_external_tool_layout:version/,
  );
});

test('all four lists can be edited and reordered independently', () => {
  let layout = createEmptyExternalToolLayoutDocument(3);
  for (const key of ALL_KEYS) {
    layout = setExternalToolLayoutAllList(layout, key, [`${key}-a`, `${key}-b`, `${key}-c`]);
  }

  for (const key of ALL_KEYS) {
    const next = reorderExternalToolLayoutAllList(
      layout,
      key,
      `${key}-a`,
      `${key}-c`,
    );
    assert.deepEqual(next.all[key], [`${key}-b`, `${key}-c`, `${key}-a`]);
    for (const untouched of ALL_KEYS.filter((candidate) => candidate !== key)) {
      assert.deepEqual(next.all[untouched], layout.all[untouched]);
    }
  }
});

test('setting an all list wins globally and removes its IDs from every other list', () => {
  let layout = setExternalToolLayoutAllList(
    createEmptyExternalToolLayoutDocument(),
    'overseasMoreOrderIds',
    ['a', 'b', 'c'],
  );
  layout = setExternalToolLayoutAllList(layout, 'overseasFeaturedIds', ['b']);
  assert.deepEqual(layout.all.overseasFeaturedIds, ['b']);
  assert.deepEqual(layout.all.overseasMoreOrderIds, ['a', 'c']);

  layout = setExternalToolLayoutAllList(layout, 'overseasMoreOrderIds', ['b', 'c', 'a']);
  assert.deepEqual(layout.all.overseasFeaturedIds, []);
  assert.deepEqual(layout.all.overseasMoreOrderIds, ['b', 'c', 'a']);

  layout = setExternalToolLayoutAllList(layout, 'domesticMoreOrderIds', ['a', 'domestic']);
  assert.deepEqual(layout.all.overseasMoreOrderIds, ['b', 'c']);
  assert.deepEqual(layout.all.domesticMoreOrderIds, ['a', 'domestic']);
});

test('explicit layout order leads while unlisted tools retain rank fallback order', () => {
  const fallbackRanked = [
    { id: 'rank-1' },
    { id: 'rank-2' },
    { id: 'rank-3' },
    { id: 'rank-4' },
  ];
  assert.deepEqual(
    orderExternalToolsByLayoutIds(fallbackRanked, ['rank-3', 'missing', 'rank-1']).map(
      (item) => item.id,
    ),
    ['rank-3', 'rank-1', 'rank-2', 'rank-4'],
  );
  assert.deepEqual(fallbackRanked.map((item) => item.id), [
    'rank-1',
    'rank-2',
    'rank-3',
    'rank-4',
  ]);
});

test('dropping a card onto itself keeps its position', () => {
  assert.deepEqual(insertExternalToolIdBefore(['a', 'b', 'c'], 'b', 'b'), [
    'a',
    'b',
    'c',
  ]);
  assert.deepEqual(insertExternalToolIdBefore(['a', 'b', 'c'], 'c', 'a'), [
    'c',
    'a',
    'b',
  ]);
});

test('parked IDs keep beginning and middle slots while visible IDs take their new order', () => {
  assert.deepEqual(
    mergeExternalToolLayoutVisibleAndParkedIds(
      ['b', 'a'],
      ['parked-start', 'a', 'parked-middle', 'b', 'parked-end'],
      new Set(['a', 'b']),
    ),
    ['parked-start', 'b', 'parked-middle', 'a', 'parked-end'],
  );
});

test('parked slots are recalculated against configured anchors that still survive', () => {
  assert.deepEqual(
    mergeExternalToolLayoutVisibleAndParkedIds(
      ['b'],
      ['a', 'parked-middle', 'b'],
      new Set(['a', 'b']),
    ),
    ['parked-middle', 'b'],
  );
});

test('category featured and more lists are isolated, sortable, and mutually exclusive', () => {
  let layout = createEmptyExternalToolLayoutDocument();
  layout = setExternalToolCategoryList(
    layout,
    'general',
    ['more-a', 'more-b', 'more-c'],
    'overseasMoreOrderIds',
  );
  layout = setExternalToolCategoryList(
    layout,
    'general',
    ['domestic-more-a', 'domestic-more-b'],
    'domesticMoreOrderIds',
  );
  layout = setExternalToolCategoryFeatured(layout, 'general', ['a', 'b']);
  layout = setExternalToolCategoryFeatured(
    layout,
    'general',
    ['domestic-a', 'domestic-b'],
    'domesticFeaturedIds',
  );
  layout = setExternalToolCategoryFeatured(layout, 'search', ['search-a']);
  layout = addExternalToolCategoryFeatured(layout, 'general', 'c', 'b');
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, ['a', 'c', 'b']);
  assert.deepEqual(layout.categories.general?.domesticFeaturedIds, [
    'domestic-a',
    'domestic-b',
  ]);
  assert.deepEqual(layout.categories.general?.overseasMoreOrderIds, [
    'more-a',
    'more-b',
    'more-c',
  ]);

  layout = reorderExternalToolCategoryList(
    layout,
    'general',
    'more-c',
    'more-a',
    'overseasMoreOrderIds',
  );
  assert.deepEqual(layout.categories.general?.overseasMoreOrderIds, [
    'more-c',
    'more-a',
    'more-b',
  ]);

  layout = reorderExternalToolCategoryFeatured(layout, 'general', 'b', 'a');
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, ['b', 'a', 'c']);
  assert.deepEqual(layout.categories.search?.overseasFeaturedIds, ['search-a']);

  layout = addExternalToolCategoryFeatured(
    layout,
    'general',
    'domestic-c',
    'domestic-b',
    'domesticFeaturedIds',
  );
  layout = reorderExternalToolCategoryFeatured(
    layout,
    'general',
    'domestic-b',
    'domestic-a',
    'domesticFeaturedIds',
  );
  assert.deepEqual(layout.categories.general?.domesticFeaturedIds, [
    'domestic-b',
    'domestic-a',
    'domestic-c',
  ]);

  layout = removeExternalToolCategoryFeatured(layout, 'general', 'a');
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, ['b', 'c']);
  layout = removeExternalToolCategoryFeatured(
    layout,
    'general',
    'domestic-a',
    'domesticFeaturedIds',
  );
  assert.deepEqual(layout.categories.general?.domesticFeaturedIds, [
    'domestic-b',
    'domestic-c',
  ]);
});

test('category featured accepts catalog IDs outside the category taxonomy', () => {
  let layout = setExternalToolCategoryFeatured(
    createEmptyExternalToolLayoutDocument(),
    'general',
    ['general-member'],
  );
  layout = addExternalToolCategoryFeatured(
    layout,
    'general',
    'search-only-tool',
    'general-member',
  );
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, [
    'search-only-tool',
    'general-member',
  ]);

  layout = reorderExternalToolCategoryFeatured(
    layout,
    'general',
    'general-member',
    'search-only-tool',
  );
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, [
    'general-member',
    'search-only-tool',
  ]);

  layout = removeExternalToolCategoryFeatured(layout, 'general', 'search-only-tool');
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, ['general-member']);
});

test('setting a category region wins and removes duplicate IDs from the other region', () => {
  let layout = setExternalToolCategoryFeatured(
    createEmptyExternalToolLayoutDocument(),
    'general',
    ['shared', 'overseas'],
  );
  layout = setExternalToolCategoryFeatured(
    layout,
    'general',
    ['shared', 'domestic'],
    'domesticFeaturedIds',
  );

  assert.deepEqual(layout.categories.general, {
    overseasFeaturedIds: ['overseas'],
    domesticFeaturedIds: ['shared', 'domestic'],
    overseasMoreOrderIds: [],
    domesticMoreOrderIds: [],
  });
});

test('removing the last regional selections removes the empty category layout', () => {
  let layout = setExternalToolCategoryFeatured(
    createEmptyExternalToolLayoutDocument(),
    'general',
    ['overseas'],
  );
  layout = setExternalToolCategoryFeatured(
    layout,
    'general',
    ['domestic'],
    'domesticFeaturedIds',
  );
  layout = removeExternalToolCategoryFeatured(layout, 'general', 'overseas');
  layout = removeExternalToolCategoryFeatured(
    layout,
    'general',
    'domestic',
    'domesticFeaturedIds',
  );

  assert.equal(layout.categories.general, undefined);
});

test('adding an existing category item moves it instead of duplicating it', () => {
  let layout = setExternalToolCategoryFeatured(
    createEmptyExternalToolLayoutDocument(),
    'general',
    ['a', 'b', 'c'],
  );
  layout = addExternalToolCategoryFeatured(layout, 'general', 'c', 'a');
  assert.deepEqual(layout.categories.general?.overseasFeaturedIds, ['c', 'a', 'b']);
});

test('clone and save payload do not mutate the confirmed snapshot', () => {
  const document = setExternalToolCategoryFeatured(
    setExternalToolLayoutAllList(
      createEmptyExternalToolLayoutDocument(9),
      'overseasFeaturedIds',
      ['a'],
    ),
    'general',
    ['a'],
  );
  const clone = cloneExternalToolLayoutDocument(document);
  clone.all.overseasFeaturedIds.push('b');
  clone.categories.general?.overseasFeaturedIds.push('b');
  clone.categories.general?.domesticFeaturedIds.push('domestic-a');
  clone.categories.general?.overseasMoreOrderIds.push('more-a');

  assert.deepEqual(document.all.overseasFeaturedIds, ['a']);
  assert.deepEqual(document.categories.general?.overseasFeaturedIds, ['a']);
  assert.deepEqual(document.categories.general?.domesticFeaturedIds, []);
  assert.deepEqual(document.categories.general?.overseasMoreOrderIds, []);
  assert.equal(externalToolLayoutsEqual(document, clone), false);

  const payload = toExternalToolLayoutSavePayload(clone, document.revision);
  assert.equal(payload.version, 1);
  assert.equal(payload.revision, 9);
  assert.equal(payload.expectedRevision, 9);
  assert.deepEqual(payload.all.overseasFeaturedIds, ['a', 'b']);
  assert.deepEqual(payload.categories.general, {
    overseasFeaturedIds: ['a', 'b'],
    domesticFeaturedIds: ['domestic-a'],
    overseasMoreOrderIds: ['more-a'],
    domesticMoreOrderIds: [],
  });
});
