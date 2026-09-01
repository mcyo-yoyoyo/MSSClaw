import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createServer, type ViteDevServer } from 'vite';

type ToolSeed = {
  id: string;
  name: string;
  desc: string;
  category: string;
  author: string;
  published: boolean;
  invokes: number;
  icon: string;
  tags: string[];
  sourceType?: 'internal' | 'external';
  visibility?: 'public' | 'org' | 'private';
  marketShelf?: 'none' | 'external' | 'internal';
  region?: 'overseas' | 'domestic';
};

type ShelfModule = {
  resolveConfiguredToolMarketShelf: (tool: ToolSeed) => 'none' | 'external' | 'internal';
  resolveToolMarketShelf: (tool: ToolSeed) => 'none' | 'external' | 'internal';
};

type MarketShelfModule = {
  listMarketToolCards: (
    tools: ToolSeed[],
    kind: 'external' | 'internal',
    viewer: {
      affiliation: { deptIds: string[]; regionId: null };
      role: 'super_admin';
    },
  ) => Array<{ id: string }>;
  listUnlistedExternalToolCards: (
    tools: ToolSeed[],
    viewer: {
      affiliation: { deptIds: string[]; regionId: null };
      role: 'super_admin';
    },
  ) => Array<{ id: string }>;
};

type MarketplaceStore = {
  getState: () => {
    tools: ToolSeed[];
    saveToolNow: (tool: ToolSeed) => Promise<{ synced: boolean }>;
  };
  setState: (state: Record<string, unknown>) => void;
};

type MutableStore = {
  setState: (state: Record<string, unknown>) => void;
};

let vite: ViteDevServer;
let shelf: ShelfModule;
let marketShelf: MarketShelfModule;
let marketplaceStore: MarketplaceStore;
let workspaceStore: MutableStore;
const originalFetch = globalThis.fetch;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  shelf = (await vite.ssrLoadModule('/src/domain/aiToolCategories.ts')) as ShelfModule;
  marketShelf = (await vite.ssrLoadModule('/src/domain/marketShelf.ts')) as MarketShelfModule;
  marketplaceStore = (
    await vite.ssrLoadModule('/src/stores/marketplaceStore.ts')
  ).useMarketplaceStore as MarketplaceStore;
  workspaceStore = (
    await vite.ssrLoadModule('/src/stores/workspaceStore.ts')
  ).useWorkspaceStore as MutableStore;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

function tool(
  id: string,
  patch: Partial<ToolSeed> = {},
): ToolSeed {
  return {
    id,
    name: id,
    desc: '',
    category: 'external',
    author: 'tester',
    published: false,
    invokes: 0,
    icon: 'fa-plug',
    tags: ['ai-saas'],
    sourceType: 'external',
    visibility: 'public',
    marketShelf: 'external',
    region: 'overseas',
    ...patch,
  };
}

test('目标货架与实际上架状态分离', () => {
  const draft = tool('draft');
  assert.equal(shelf.resolveConfiguredToolMarketShelf(draft), 'external');
  assert.equal(shelf.resolveToolMarketShelf(draft), 'none');

  const listed = tool('listed', { published: true });
  assert.equal(shelf.resolveConfiguredToolMarketShelf(listed), 'external');
  assert.equal(shelf.resolveToolMarketShelf(listed), 'external');

  const parked = tool('parked', { marketShelf: 'none' });
  assert.equal(shelf.resolveConfiguredToolMarketShelf(parked), 'none');
  assert.equal(shelf.resolveToolMarketShelf(parked), 'none');
});

test('用户货架不展示未上架工具，但运营候选仍保留它', () => {
  const cards = marketShelf.listMarketToolCards(
    [tool('draft'), tool('listed', { published: true })],
    'external',
    {
      affiliation: { deptIds: [], regionId: null },
      role: 'super_admin',
    },
  );

  assert.deepEqual(cards.map((card) => card.id), ['listed']);
  assert.deepEqual(
    marketShelf.listUnlistedExternalToolCards([tool('draft')], {
      affiliation: { deptIds: [], regionId: null },
      role: 'super_admin',
    }).map((card) => card.id),
    ['draft'],
  );
});

test('门户未上架列表只包含目标为外部货架的未上架工具', () => {
  const cards = marketShelf.listUnlistedExternalToolCards(
    [
      tool('draft'),
      tool('listed', { published: true }),
      tool('parked', { marketShelf: 'none' }),
      tool('internal', {
        sourceType: 'internal',
        marketShelf: 'internal',
        tags: ['hw-internal'],
      }),
    ],
    {
      affiliation: { deptIds: [], regionId: null },
      role: 'super_admin',
    },
  );

  assert.deepEqual(cards.map((card) => card.id), ['draft']);
});

test('工具上下架都通过 marketplace 持久化直接改变状态', async () => {
  workspaceStore.setState({
    workspaceId: 'ws-tool-listing-test',
    apiConnected: true,
    apiStatus: 'connected',
  });
  marketplaceStore.setState({ tools: [tool('direct-listing-tool', { published: true })] });
  globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;

  const listedTool = marketplaceStore.getState().tools[0];
  assert.ok(listedTool);
  assert.deepEqual(
    await marketplaceStore.getState().saveToolNow({ ...listedTool, published: false }),
    { synced: true },
  );
  assert.equal(marketplaceStore.getState().tools[0]?.published, false);

  const unlistedTool = marketplaceStore.getState().tools[0];
  assert.ok(unlistedTool);
  assert.deepEqual(
    await marketplaceStore.getState().saveToolNow({ ...unlistedTool, published: true }),
    { synced: true },
  );
  assert.equal(marketplaceStore.getState().tools[0]?.published, true);
});
