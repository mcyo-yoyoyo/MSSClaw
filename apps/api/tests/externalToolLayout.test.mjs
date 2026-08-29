import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_EXTERNAL_TOOL_LAYOUT } from '../dist/data/market-doc-seeds.js';
import {
  canonicalizeExternalToolLayoutInput,
  PlatformDocsService,
} from '../dist/persistence/platform-docs.service.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';

function validLayout(expectedRevision = 0) {
  return {
    expectedRevision,
    all: {
      overseasFeaturedIds: ['tool-overseas-featured'],
      domesticFeaturedIds: ['tool-domestic-featured'],
      overseasMoreOrderIds: ['tool-overseas-more'],
      domesticMoreOrderIds: ['tool-domestic-more'],
    },
    categories: {
      search: {
        overseasFeaturedIds: ['tool-overseas-featured'],
        domesticFeaturedIds: ['tool-domestic-featured'],
        overseasMoreOrderIds: ['tool-overseas-more'],
        domesticMoreOrderIds: ['tool-domestic-more'],
      },
    },
  };
}

function fakePrisma(initialRow = null, executeResult = 1, auxiliaryRows = []) {
  let row = initialRow;
  let seededCreate = null;
  let created = null;
  let executeCalls = 0;
  let findFirstCalls = 0;

  return {
    workspace: {
      findUnique: async () => ({ id: 'ws-test' }),
    },
    centerRecord: {
      findUnique: async () => row,
      findFirst: async ({ where }) => {
        findFirstCalls += 1;
        return (
          auxiliaryRows.find(
            (candidate) =>
              candidate.workspaceId === where.workspaceId && candidate.kind === where.kind,
          ) ?? null
        );
      },
      findMany: async () => [],
      upsert: async ({ create }) => {
        seededCreate = create;
        row = { ...create };
        return row;
      },
      create: async ({ data }) => {
        created = data;
        row = { ...data };
        return row;
      },
    },
    $executeRaw: async () => {
      executeCalls += 1;
      return executeResult;
    },
    state: () => ({ row, seededCreate, created, executeCalls, findFirstCalls }),
  };
}

test('normalizes IDs, removes duplicates, and keeps only canonical fields', () => {
  const normalized = canonicalizeExternalToolLayoutInput({
    expectedRevision: 4,
    version: 999,
    revision: 999,
    unknown: true,
    all: {
      overseasFeaturedIds: [' tool-a ', 'tool-a'],
      domesticFeaturedIds: ['tool-c'],
      overseasMoreOrderIds: ['tool-a', 'tool-b', 'tool-b'],
      domesticMoreOrderIds: ['tool-c', 'tool-d'],
      ignored: ['tool-z'],
    },
    categories: {
      ' Search ': {
        overseasFeaturedIds: [' tool-a ', 'tool-a', 'tool-b'],
        domesticFeaturedIds: ['tool-b', ' tool-c ', 'tool-c'],
        overseasMoreOrderIds: ['tool-a', ' tool-d ', 'tool-d'],
        domesticMoreOrderIds: ['tool-c', 'tool-d', ' tool-e ', 'tool-e'],
        ignored: true,
      },
    },
  });

  assert.deepEqual(normalized, {
    expectedRevision: 4,
    all: {
      overseasFeaturedIds: ['tool-a'],
      domesticFeaturedIds: ['tool-c'],
      overseasMoreOrderIds: ['tool-b'],
      domesticMoreOrderIds: ['tool-d'],
    },
    categories: {
      search: {
        overseasFeaturedIds: ['tool-a', 'tool-b'],
        domesticFeaturedIds: ['tool-c'],
        overseasMoreOrderIds: ['tool-d'],
        domesticMoreOrderIds: ['tool-e'],
      },
    },
  });
});

test('accepts legacy category writes without additive fields and emits all four lists', () => {
  const legacyInput = validLayout();
  legacyInput.categories.search = {
    overseasFeaturedIds: ['tool-overseas-featured'],
  };

  const normalized = canonicalizeExternalToolLayoutInput(legacyInput);

  assert.deepEqual(normalized.categories.search, {
    overseasFeaturedIds: ['tool-overseas-featured'],
    domesticFeaturedIds: [],
    overseasMoreOrderIds: [],
    domesticMoreOrderIds: [],
  });
});

test('keeps each category tool in only the first list with featured taking priority', () => {
  const input = validLayout();
  input.categories.search = {
    overseasFeaturedIds: ['tool-shared', 'tool-overseas-featured'],
    domesticFeaturedIds: [
      'tool-shared',
      'tool-domestic-featured',
      'tool-cross-more',
    ],
    overseasMoreOrderIds: [
      'tool-shared',
      'tool-cross-more',
      'tool-overseas-more',
    ],
    domesticMoreOrderIds: [
      'tool-domestic-featured',
      'tool-overseas-more',
      'tool-domestic-more',
    ],
  };

  const normalized = canonicalizeExternalToolLayoutInput(input);

  assert.deepEqual(normalized.categories.search, {
    overseasFeaturedIds: ['tool-shared', 'tool-overseas-featured'],
    domesticFeaturedIds: ['tool-domestic-featured', 'tool-cross-more'],
    overseasMoreOrderIds: ['tool-overseas-more'],
    domesticMoreOrderIds: ['tool-domestic-more'],
  });
});

test('keeps each tool in only the first of the four regional lists', () => {
  const normalized = canonicalizeExternalToolLayoutInput({
    expectedRevision: 0,
    all: {
      overseasFeaturedIds: ['tool-shared', 'tool-overseas-featured'],
      domesticFeaturedIds: ['tool-shared', 'tool-domestic-featured', 'tool-cross-more'],
      overseasMoreOrderIds: [
        'tool-shared',
        'tool-cross-more',
        'tool-overseas-more',
      ],
      domesticMoreOrderIds: [
        'tool-shared',
        'tool-cross-more',
        'tool-overseas-more',
        'tool-domestic-more',
      ],
    },
    categories: {},
  });

  assert.deepEqual(normalized.all, {
    overseasFeaturedIds: ['tool-shared', 'tool-overseas-featured'],
    domesticFeaturedIds: ['tool-domestic-featured', 'tool-cross-more'],
    overseasMoreOrderIds: ['tool-overseas-more'],
    domesticMoreOrderIds: ['tool-domestic-more'],
  });
});

test('rejects invalid IDs and oversized lists before persistence', () => {
  const invalidId = validLayout();
  invalidId.all.overseasFeaturedIds = ['tool id with spaces'];
  assert.throws(
    () => canonicalizeExternalToolLayoutInput(invalidId),
    /invalid_external_tool_layout:all\.overseasFeaturedIds\[0\]:invalid_id/,
  );

  const oversized = validLayout();
  oversized.all.overseasMoreOrderIds = Array.from({ length: 501 }, () => 'tool-a');
  assert.throws(
    () => canonicalizeExternalToolLayoutInput(oversized),
    /invalid_external_tool_layout:all\.overseasMoreOrderIds:max_items_500/,
  );

  for (const unsafeCategoryId of ['__proto__', 'prototype', 'constructor']) {
    const unsafeCategory = validLayout();
    unsafeCategory.categories = Object.fromEntries([
      [unsafeCategoryId, { overseasFeaturedIds: ['tool-a'] }],
    ]);
    assert.throws(
      () => canonicalizeExternalToolLayoutInput(unsafeCategory),
      /invalid_external_tool_layout:categories\..*:(?:invalid_id|unsafe_id)/,
    );
  }

  const invalidDomesticCategory = validLayout();
  invalidDomesticCategory.categories.search.domesticFeaturedIds = 'tool-domestic';
  assert.throws(
    () => canonicalizeExternalToolLayoutInput(invalidDomesticCategory),
    /invalid_external_tool_layout:categories\.search\.domesticFeaturedIds:array_required/,
  );

  const invalidCategoryMore = validLayout();
  invalidCategoryMore.categories.search.overseasMoreOrderIds = 'tool-overseas-more';
  assert.throws(
    () => canonicalizeExternalToolLayoutInput(invalidCategoryMore),
    /invalid_external_tool_layout:categories\.search\.overseasMoreOrderIds:array_required/,
  );
});

test('GET creates and returns the versioned seed when the document is missing', async () => {
  const prisma = fakePrisma();
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'external-tool-layout');

  assert.deepEqual(result, {
    kind: 'external-tool-layout',
    payload: SEED_EXTERNAL_TOOL_LAYOUT,
  });
  assert.deepEqual(prisma.state().seededCreate?.payload, SEED_EXTERNAL_TOOL_LAYOUT);
  assert.equal(prisma.state().seededCreate?.kind, 'doc:external-tool-layout');
});

test('first GET migrates custom legacy external pins by marketplace region and pin order', async () => {
  const prisma = fakePrisma(null, 1, [
    {
      workspaceId: 'ws-test',
      kind: 'doc:market-featured',
      payload: {
        pins: {
          external: [
            ' tool-domestic-2 ',
            'tool-overseas-2',
            'tool-unknown',
            'tool-overseas-1',
            'tool-domestic-1',
            'tool-overseas-2',
          ],
        },
      },
    },
    {
      workspaceId: 'ws-test',
      kind: 'marketplace',
      payload: {
        tools: [
          { id: 'tool-overseas-1', region: 'overseas' },
          { id: 'tool-domestic-1', region: 'domestic' },
          { id: 'tool-overseas-2', region: 'overseas' },
          { id: 'tool-domestic-2', region: 'domestic' },
        ],
      },
    },
  ]);
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'external-tool-layout');

  assert.deepEqual(result.payload, {
    version: 1,
    revision: 0,
    all: {
      overseasFeaturedIds: ['tool-overseas-2', 'tool-overseas-1'],
      domesticFeaturedIds: ['tool-domestic-2', 'tool-domestic-1'],
      overseasMoreOrderIds: [],
      domesticMoreOrderIds: [],
    },
    categories: {},
  });
  assert.deepEqual(prisma.state().seededCreate?.payload, result.payload);
  assert.equal(prisma.state().findFirstCalls, 2);
});

test('GET keeps an existing external layout without consulting or applying legacy pins', async () => {
  const existingPayload = {
    version: 1,
    revision: 9,
    all: {
      overseasFeaturedIds: ['tool-custom-overseas'],
      domesticFeaturedIds: [],
      overseasMoreOrderIds: ['tool-custom-more'],
      domesticMoreOrderIds: [],
    },
    categories: {
      search: {
        overseasFeaturedIds: ['tool-custom-overseas'],
        domesticFeaturedIds: ['tool-custom-domestic'],
        overseasMoreOrderIds: ['tool-custom-overseas-more'],
        domesticMoreOrderIds: ['tool-custom-domestic-more'],
      },
    },
  };
  const prisma = fakePrisma({
    id: 'doc-external-tool-layout-ws-test',
    workspaceId: 'ws-test',
    kind: 'doc:external-tool-layout',
    payload: existingPayload,
  });
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'external-tool-layout');

  assert.deepEqual(result.payload, existingPayload);
  assert.equal(prisma.state().findFirstCalls, 0);
  assert.equal(prisma.state().seededCreate, null);
});

test('GET adds empty additive category lists to legacy data without persisting over it', async () => {
  const existingPayload = {
    version: 1,
    revision: 7,
    all: {
      overseasFeaturedIds: ['tool-custom-overseas'],
      domesticFeaturedIds: ['tool-custom-domestic'],
      overseasMoreOrderIds: [],
      domesticMoreOrderIds: [],
    },
    categories: {
      search: {
        overseasFeaturedIds: ['tool-custom-overseas'],
        operatorNote: 'preserve-me',
      },
    },
  };
  const prisma = fakePrisma({
    id: 'doc-external-tool-layout-ws-test',
    workspaceId: 'ws-test',
    kind: 'doc:external-tool-layout',
    payload: existingPayload,
  });
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'external-tool-layout');

  assert.deepEqual(result.payload.categories.search, {
    overseasFeaturedIds: ['tool-custom-overseas'],
    domesticFeaturedIds: [],
    overseasMoreOrderIds: [],
    domesticMoreOrderIds: [],
    operatorNote: 'preserve-me',
  });
  assert.deepEqual(prisma.state().row.payload, existingPayload);
  assert.equal(prisma.state().seededCreate, null);
});

test('GET does not disguise malformed stored category lists as legacy missing data', async () => {
  const existingPayload = {
    ...SEED_EXTERNAL_TOOL_LAYOUT,
    revision: 4,
    categories: {
      search: {
        overseasFeaturedIds: ['tool-custom-overseas'],
        domesticFeaturedIds: 'malformed',
        overseasMoreOrderIds: 'malformed-more',
      },
    },
  };
  const prisma = fakePrisma({
    id: 'doc-external-tool-layout-ws-test',
    workspaceId: 'ws-test',
    kind: 'doc:external-tool-layout',
    payload: existingPayload,
  });
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'external-tool-layout');

  assert.equal(result.payload.categories.search.domesticFeaturedIds, 'malformed');
  assert.equal(result.payload.categories.search.overseasMoreOrderIds, 'malformed-more');
  assert.deepEqual(result.payload.categories.search.domesticMoreOrderIds, []);
  assert.deepEqual(prisma.state().row.payload, existingPayload);
});

test('legacy PUT preserves existing category lists but gives new categories empty lists', async () => {
  const existingPayload = {
    ...SEED_EXTERNAL_TOOL_LAYOUT,
    revision: 2,
    categories: {
      search: {
        overseasFeaturedIds: ['tool-existing-overseas'],
        domesticFeaturedIds: ['tool-existing-domestic'],
        overseasMoreOrderIds: [
          'tool-overseas-featured',
          'tool-existing-overseas-more',
        ],
        domesticMoreOrderIds: [
          'tool-existing-overseas-more',
          'tool-existing-domestic-more',
        ],
      },
    },
  };
  const prisma = fakePrisma({
    id: 'doc-external-tool-layout-ws-test',
    workspaceId: 'ws-test',
    kind: 'doc:external-tool-layout',
    payload: existingPayload,
  });
  const service = new PlatformDocsService(prisma, {});
  const legacyWrite = validLayout(2);
  delete legacyWrite.categories.search.domesticFeaturedIds;
  delete legacyWrite.categories.search.overseasMoreOrderIds;
  delete legacyWrite.categories.search.domesticMoreOrderIds;
  legacyWrite.categories.general = {
    overseasFeaturedIds: ['tool-new-overseas'],
  };

  const saved = await service.putDoc('ws-test', 'external-tool-layout', legacyWrite);

  assert.deepEqual(saved.payload.categories, {
    search: {
      overseasFeaturedIds: ['tool-overseas-featured'],
      domesticFeaturedIds: ['tool-existing-domestic'],
      overseasMoreOrderIds: ['tool-existing-overseas-more'],
      domesticMoreOrderIds: ['tool-existing-domestic-more'],
    },
    general: {
      overseasFeaturedIds: ['tool-new-overseas'],
      domesticFeaturedIds: [],
      overseasMoreOrderIds: [],
      domesticMoreOrderIds: [],
    },
  });
  assert.equal(saved.payload.revision, 3);
});

test('PUT increments revision and rejects a stale expectedRevision with currentRevision', async () => {
  const prisma = fakePrisma({
    id: 'doc-external-tool-layout-ws-test',
    workspaceId: 'ws-test',
    kind: 'doc:external-tool-layout',
    payload: { ...SEED_EXTERNAL_TOOL_LAYOUT, revision: 2 },
  });
  const service = new PlatformDocsService(prisma, {});

  const saved = await service.putDoc('ws-test', 'external-tool-layout', validLayout(2));
  assert.equal(saved.payload.version, 1);
  assert.equal(saved.payload.revision, 3);
  assert.deepEqual(saved.payload.all, validLayout(2).all);
  assert.deepEqual(saved.payload.categories, validLayout(2).categories);
  assert.equal(prisma.state().executeCalls, 1);

  await assert.rejects(
    service.putDoc('ws-test', 'external-tool-layout', validLayout(1)),
    (error) => {
      assert.equal(error.getStatus(), 409);
      assert.deepEqual(error.getResponse(), {
        error: 'external_tool_layout_revision_conflict',
        expectedRevision: 1,
        currentRevision: 2,
      });
      return true;
    },
  );
});

test('controller lets guests read external tool layout without a session', async () => {
  let meCalls = 0;
  const controller = new PlatformDocsController({
    me: async () => {
      meCalls += 1;
      return { ok: false, error: '未登录' };
    },
    getDoc: async (workspaceId, kind) => ({ workspaceId, kind }),
  });

  // 游客模式：货架布局是门户展示数据，未登录也要能渲染
  assert.deepEqual(await controller.getOne('ws-test', 'external-tool-layout'), {
    workspaceId: 'ws-test',
    kind: 'external-tool-layout',
  });
  assert.equal(meCalls, 0);
});

test('controller allows members to read but only super admins to write the layout', async () => {
  let role = 'viewer';
  let savedPayload = null;
  const controller = new PlatformDocsController({
    me: async () => ({
      ok: true,
      user: { id: 'user-test', platformRole: role },
    }),
    getDoc: async (workspaceId, kind) => ({ workspaceId, kind }),
    putDoc: async (workspaceId, kind, payload) => {
      savedPayload = payload;
      return { workspaceId, kind, payload };
    },
  });

  assert.deepEqual(await controller.getOne('ws-test', 'external-tool-layout'), {
    workspaceId: 'ws-test',
    kind: 'external-tool-layout',
  });
  await assert.rejects(
    controller.putOne('ws-test', 'external-tool-layout', { payload: validLayout() }, 'Bearer ok'),
    (error) => error?.getStatus?.() === 403,
  );

  role = 'super_admin';
  await controller.putOne(
    'ws-test',
    'external-tool-layout',
    { payload: validLayout() },
    'Bearer ok',
  );
  assert.deepEqual(savedPayload, validLayout());
});

test('controller opens internal office scenes for guest reads but still guards writes', async () => {
  let getCalls = 0;
  let putCalls = 0;
  const controller = new PlatformDocsController({
    me: async () => ({ ok: false, error: '未登录' }),
    getDoc: async () => {
      getCalls += 1;
      return { ok: true };
    },
    putDoc: async () => {
      putCalls += 1;
    },
  });

  assert.deepEqual(await controller.getOne('ws-test', 'internal-office-scenes'), { ok: true });
  await assert.rejects(
    controller.putOne('ws-test', 'internal-office-scenes', { payload: { entries: [] } }),
    (error) => {
      assert.equal(error?.getStatus?.(), 401);
      assert.equal(error?.getResponse?.().message, '未登录');
      return true;
    },
  );
  assert.equal(getCalls, 1);
  assert.equal(putCalls, 0);
});

test('controller lets workspace members read internal scenes but rejects non-admin writes', async () => {
  let putCalls = 0;
  const controller = new PlatformDocsController({
    me: async () => ({
      ok: true,
      user: { id: 'user-test', platformRole: 'business_user' },
    }),
    getDoc: async (workspaceId, kind) => ({ workspaceId, kind }),
    putDoc: async () => {
      putCalls += 1;
    },
  });

  assert.deepEqual(
    await controller.getOne('ws-test', 'internal-office-scenes', 'Bearer member-token'),
    { workspaceId: 'ws-test', kind: 'internal-office-scenes' },
  );
  await assert.rejects(
    controller.putOne(
      'ws-test',
      'internal-office-scenes',
      { payload: { entries: [] } },
      'Bearer member-token',
    ),
    (error) => {
      assert.equal(error?.getStatus?.(), 403);
      assert.equal(error?.getResponse?.().message, 'internal_office_scenes_admin_required');
      return true;
    },
  );
  assert.equal(putCalls, 0);
});

test('controller allows super admins to write internal scene order without changing payload shape', async () => {
  const payload = {
    expectedRevision: 7,
    entries: [
      {
        id: 'capture',
        label: '录音及纪要',
        english: 'CAPTURE',
        description: '记录会议',
        icon: 'fa-note-sticky',
        visible: true,
        toolIds: ['tool-note'],
        toolBlurbs: { 'tool-note': '云笔记' },
      },
    ],
  };
  let saved = null;
  const controller = new PlatformDocsController({
    me: async () => ({
      ok: true,
      user: { id: 'admin-test', platformRole: 'super_admin' },
    }),
    putDoc: async (workspaceId, kind, nextPayload) => {
      saved = { workspaceId, kind, payload: nextPayload };
      return saved;
    },
  });

  assert.deepEqual(
    await controller.putOne(
      'ws-test',
      'internal-office-scenes',
      { payload },
      'Bearer admin-token',
    ),
    { workspaceId: 'ws-test', kind: 'internal-office-scenes', payload },
  );
  assert.deepEqual(saved, {
    workspaceId: 'ws-test',
    kind: 'internal-office-scenes',
    payload,
  });
});
