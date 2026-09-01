import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createServer, type ViteDevServer } from 'vite';

type MarketplaceSnapshot = {
  agents: unknown[];
  skills: unknown[];
  tools: Array<Record<string, unknown>>;
  automations: unknown[];
  kbDocs: unknown[];
};

type MarketplaceSaveResult = {
  synced: boolean;
  reason?: 'offline' | 'failed';
  detail?: string;
};

type StorageModule = {
  flushSaveMarketplace: (
    workspaceId: string,
    snapshot: MarketplaceSnapshot,
  ) => Promise<MarketplaceSaveResult>;
  scheduleSaveMarketplace: (
    workspaceId: string,
    snapshot: MarketplaceSnapshot,
    ms?: number,
  ) => void;
};

type WorkspaceStoreModule = {
  useWorkspaceStore: {
    setState: (state: Record<string, unknown>) => void;
  };
};

type MarketplaceStoreState = {
  agents: unknown[];
  skills: unknown[];
  tools: Array<Record<string, unknown>>;
  automations: unknown[];
  kbDocs: unknown[];
  saveToolNow: (
    tool: Record<string, unknown>,
    isNew?: boolean,
  ) => Promise<MarketplaceSaveResult>;
  deleteToolNow: (id: string) => Promise<MarketplaceSaveResult>;
  persist: () => void;
  bumpToolInvokes: (id: string) => void;
};

type MarketplaceStoreModule = {
  useMarketplaceStore: {
    getState: () => MarketplaceStoreState;
    setState: (state: Partial<MarketplaceStoreState>) => void;
  };
};

type FetchCall = {
  url: string;
  method?: string;
  body: MarketplaceSnapshot;
};

let vite: ViteDevServer;
let storage: StorageModule;
let workspaceStore: WorkspaceStoreModule['useWorkspaceStore'];
let marketplaceStore: MarketplaceStoreModule['useMarketplaceStore'];
const originalFetch = globalThis.fetch;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  storage = (await vite.ssrLoadModule(
    '/src/domain/persistence/storage.ts',
  )) as StorageModule;
  workspaceStore = (
    (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as WorkspaceStoreModule
  ).useWorkspaceStore;
  marketplaceStore = (
    (await vite.ssrLoadModule('/src/stores/marketplaceStore.ts')) as MarketplaceStoreModule
  ).useMarketplaceStore;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

function snapshot(marker: string): MarketplaceSnapshot {
  return {
    agents: [],
    skills: [],
    tools: [{ id: marker, name: marker }],
    automations: [],
    kbDocs: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function readFetchCall(input: RequestInfo | URL, init?: RequestInit): FetchCall {
  return {
    url: String(input),
    method: init?.method,
    body: JSON.parse(String(init?.body)) as MarketplaceSnapshot,
  };
}

async function nextTurn() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function waitForCallCount(calls: FetchCall[], count: number, timeoutMs = 1_200) {
  const deadline = Date.now() + timeoutMs;
  while (calls.length < count && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(calls.length, count);
}

function enableRemoteApi(workspaceId: string) {
  workspaceStore.setState({
    workspaceId,
    apiConnected: true,
    apiStatus: 'connected',
  });
}

test('flush cancels a pending debounce, writes the latest snapshot once, and waits for PUT', async () => {
  const workspaceId = 'ws-test-flush-latest';
  const calls: FetchCall[] = [];
  const response = deferred<Response>();
  enableRemoteApi(workspaceId);
  globalThis.fetch = (async (input, init) => {
    calls.push(readFetchCall(input, init));
    return response.promise;
  }) as typeof fetch;

  storage.scheduleSaveMarketplace(workspaceId, snapshot('stale'), 30);
  let settled = false;
  const saving = storage
    .flushSaveMarketplace(workspaceId, snapshot('latest'))
    .finally(() => {
      settled = true;
    });

  await nextTurn();
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, `/api/v1/workspaces/${workspaceId}/marketplace`);
  assert.equal(calls[0]?.method, 'PUT');
  assert.equal(calls[0]?.body.tools[0]?.id, 'latest');
  assert.equal(settled, false, 'flush must not resolve before the remote PUT resolves');

  response.resolve(new Response(null, { status: 200 }));
  assert.deepEqual(await saving, { synced: true });
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  assert.equal(calls.length, 1, 'the cancelled debounce must not write again');
});

test('flush serializes writes for one workspace', async () => {
  const workspaceId = 'ws-test-flush-serial';
  const calls: FetchCall[] = [];
  const responses = [deferred<Response>(), deferred<Response>()];
  enableRemoteApi(workspaceId);
  globalThis.fetch = (async (input, init) => {
    const callIndex = calls.length;
    calls.push(readFetchCall(input, init));
    return responses[callIndex]!.promise;
  }) as typeof fetch;

  const first = storage.flushSaveMarketplace(workspaceId, snapshot('first'));
  const second = storage.flushSaveMarketplace(workspaceId, snapshot('second'));

  await nextTurn();
  assert.equal(calls.length, 1, 'the second PUT must wait for the first PUT');
  assert.equal(calls[0]?.body.tools[0]?.id, 'first');

  responses[0]!.resolve(new Response(null, { status: 200 }));
  await nextTurn();
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.body.tools[0]?.id, 'second');

  responses[1]!.resolve(new Response(null, { status: 200 }));
  assert.deepEqual(await first, { synced: true });
  assert.deepEqual(await second, { synced: true });
});

test('flush exposes a failed remote write to its caller', async () => {
  const workspaceId = 'ws-test-flush-failure';
  enableRemoteApi(workspaceId);
  globalThis.fetch = (async () => new Response(null, { status: 503 })) as typeof fetch;

  assert.deepEqual(
    await storage.flushSaveMarketplace(workspaceId, snapshot('failed')),
    { synced: false, reason: 'failed', detail: 'HTTP 503' },
  );
});

test('saveToolNow commits the edited tool only after the remote save succeeds', async () => {
  const workspaceId = 'ws-test-tool-success';
  const calls: FetchCall[] = [];
  const response = deferred<Response>();
  const originalTool = {
    id: 'tool-excel-trae-work',
    name: 'Trae Work',
    desc: '',
    homepageUrl: 'https://old.example.com',
  };
  const editedTool = {
    ...originalTool,
    homepageUrl: 'https://www.trae.cn',
    logoUrl:
      'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/trae-color.svg',
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [originalTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async (input, init) => {
    calls.push(readFetchCall(input, init));
    return response.promise;
  }) as typeof fetch;

  const saving = marketplaceStore.getState().saveToolNow(editedTool);
  await nextTurn();

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]?.body.tools[0]?.logoUrl,
    editedTool.logoUrl,
    'the persisted snapshot must contain the materialized Logo',
  );
  assert.equal(
    marketplaceStore.getState().tools[0]?.homepageUrl,
    originalTool.homepageUrl,
    'the editor state must not claim success while PUT is pending',
  );

  response.resolve(new Response(null, { status: 200 }));
  assert.deepEqual(await saving, { synced: true });
  assert.deepEqual(marketplaceStore.getState().tools, [editedTool]);
});

test('saveToolNow can directly persist external tool listing and unlisting', async () => {
  const workspaceId = 'ws-test-tool-direct-unlist';
  const calls: FetchCall[] = [];
  const listedTool = {
    id: 'tool-direct-unlist',
    name: 'Direct unlist',
    desc: '',
    published: true,
    marketShelf: 'external',
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [listedTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async (input, init) => {
    calls.push(readFetchCall(input, init));
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  assert.deepEqual(
    await marketplaceStore.getState().saveToolNow({ ...listedTool, published: false }),
    { synced: true },
  );
  assert.equal(calls[0]?.body.tools[0]?.published, false);
  assert.equal(calls[0]?.body.tools[0]?.marketShelf, 'external');
  assert.equal(marketplaceStore.getState().tools[0]?.published, false);

  const unlistedTool = marketplaceStore.getState().tools[0];
  assert.ok(unlistedTool);
  assert.deepEqual(
    await marketplaceStore.getState().saveToolNow({ ...unlistedTool, published: true }),
    { synced: true },
  );
  assert.equal(calls[1]?.body.tools[0]?.published, true);
  assert.equal(calls[1]?.body.tools[0]?.marketShelf, 'external');
  assert.equal(marketplaceStore.getState().tools[0]?.published, true);
});

test('saveToolNow keeps the previous tool when the remote save fails', async () => {
  const workspaceId = 'ws-test-tool-failure';
  const originalTool = {
    id: 'tool-excel-trae-work',
    name: 'Trae Work',
    desc: '',
    homepageUrl: 'https://old.example.com',
  };
  const editedTool = {
    ...originalTool,
    homepageUrl: 'https://www.trae.cn',
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [originalTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;

  assert.deepEqual(await marketplaceStore.getState().saveToolNow(editedTool), {
    synced: false,
    reason: 'failed',
    detail: 'HTTP 500',
  });
  assert.deepEqual(marketplaceStore.getState().tools, [originalTool]);
});

test('deleteToolNow commits the removal only after the remote save succeeds', async () => {
  const workspaceId = 'ws-test-tool-delete-success';
  const calls: FetchCall[] = [];
  const response = deferred<Response>();
  const keepTool = { id: 'tool-keep', name: 'Keep' };
  const deleteTool = { id: 'tool-delete', name: 'Delete' };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [keepTool, deleteTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async (input, init) => {
    calls.push(readFetchCall(input, init));
    return response.promise;
  }) as typeof fetch;

  const deleting = marketplaceStore.getState().deleteToolNow(deleteTool.id);
  await nextTurn();

  assert.deepEqual(calls[0]?.body.tools, [keepTool]);
  assert.deepEqual(
    marketplaceStore.getState().tools,
    [keepTool, deleteTool],
    'the card must remain visible while the remote PUT is pending',
  );

  response.resolve(new Response(null, { status: 200 }));
  assert.deepEqual(await deleting, { synced: true });
  assert.deepEqual(marketplaceStore.getState().tools, [keepTool]);
});

test('deleteToolNow keeps the tool when the remote save fails', async () => {
  const workspaceId = 'ws-test-tool-delete-failure';
  const tool = { id: 'tool-delete-failure', name: 'Delete failure' };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [tool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;

  assert.deepEqual(await marketplaceStore.getState().deleteToolNow(tool.id), {
    synced: false,
    reason: 'failed',
    detail: 'HTTP 500',
  });
  assert.deepEqual(marketplaceStore.getState().tools, [tool]);
});

test('deleteToolNow does not commit into a different workspace', async () => {
  const workspaceId = 'ws-test-tool-delete-switch-origin';
  const response = deferred<Response>();
  const tool = { id: 'tool-delete-switch', name: 'Delete switch' };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [tool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async () => response.promise) as typeof fetch;

  const deleting = marketplaceStore.getState().deleteToolNow(tool.id);
  await nextTurn();
  workspaceStore.setState({ workspaceId: 'ws-test-tool-delete-switch-destination' });
  response.resolve(new Response(null, { status: 200 }));

  assert.deepEqual(await deleting, {
    synced: false,
    reason: 'failed',
    detail: 'workspace_changed',
  });
  assert.deepEqual(marketplaceStore.getState().tools, [tool]);
});

test('saveToolNow does not report success or commit into a different workspace', async () => {
  const workspaceId = 'ws-test-tool-switch-origin';
  const response = deferred<Response>();
  const originalTool = {
    id: 'tool-workspace-switch',
    name: 'Workspace switch',
    desc: '',
    homepageUrl: 'https://old.example.com',
  };
  const editedTool = {
    ...originalTool,
    homepageUrl: 'https://new.example.com',
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [originalTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async () => response.promise) as typeof fetch;

  const saving = marketplaceStore.getState().saveToolNow(editedTool);
  await nextTurn();
  workspaceStore.setState({ workspaceId: 'ws-test-tool-switch-destination' });
  response.resolve(new Response(null, { status: 200 }));

  assert.deepEqual(await saving, {
    synced: false,
    reason: 'failed',
    detail: 'workspace_changed',
  });
  assert.deepEqual(marketplaceStore.getState().tools, [originalTool]);
});

test('ordinary persist during saveToolNow keeps both the edited branding and the latest invoke count', async () => {
  const workspaceId = 'ws-test-tool-save-plus-persist';
  const calls: FetchCall[] = [];
  const firstResponse = deferred<Response>();
  const logoUrl =
    'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/trae-color.svg';
  const originalTool = {
    id: 'tool-saas-trae',
    name: 'TRAE',
    desc: '',
    homepageUrl: 'https://old.example.com',
    invokes: 0,
  };
  const editedTool = {
    ...originalTool,
    homepageUrl: 'https://www.trae.ai/',
    logoUrl,
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [originalTool],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async (input, init) => {
    calls.push(readFetchCall(input, init));
    if (calls.length === 1) return firstResponse.promise;
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  const saving = marketplaceStore.getState().saveToolNow(editedTool);
  await nextTurn();
  marketplaceStore.getState().bumpToolInvokes(originalTool.id);
  firstResponse.resolve(new Response(null, { status: 200 }));

  assert.deepEqual(await saving, { synced: true });
  await waitForCallCount(calls, 2);
  const finalTool = calls[1]?.body.tools.find((tool) => tool.id === editedTool.id);
  assert.equal(finalTool?.homepageUrl, editedTool.homepageUrl);
  assert.equal(finalTool?.logoUrl, logoUrl);
  assert.equal(finalTool?.invokes, 1);
  assert.equal(marketplaceStore.getState().tools[0]?.invokes, 1);
});

test('concurrent saveToolNow calls do not overwrite the first confirmed tool with a stale snapshot', async () => {
  const workspaceId = 'ws-test-concurrent-tools';
  const calls: FetchCall[] = [];
  const responses = [deferred<Response>(), deferred<Response>()];
  const firstOriginal = {
    id: 'tool-first',
    name: 'First',
    desc: '',
    homepageUrl: 'https://old-first.example.com',
  };
  const secondOriginal = {
    id: 'tool-second',
    name: 'Second',
    desc: '',
    homepageUrl: 'https://old-second.example.com',
  };
  const firstEdited = {
    ...firstOriginal,
    homepageUrl: 'https://new-first.example.com',
  };
  const secondEdited = {
    ...secondOriginal,
    homepageUrl: 'https://new-second.example.com',
  };
  enableRemoteApi(workspaceId);
  marketplaceStore.setState({
    agents: [],
    skills: [],
    tools: [firstOriginal, secondOriginal],
    automations: [],
    kbDocs: [],
  });
  globalThis.fetch = (async (input, init) => {
    const callIndex = calls.length;
    calls.push(readFetchCall(input, init));
    return responses[callIndex]!.promise;
  }) as typeof fetch;

  const firstSave = marketplaceStore.getState().saveToolNow(firstEdited);
  const secondSave = marketplaceStore.getState().saveToolNow(secondEdited);
  await nextTurn();
  assert.equal(calls.length, 1);

  responses[0]!.resolve(new Response(null, { status: 200 }));
  await nextTurn();
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1]?.body.tools.find((tool) => tool.id === firstEdited.id)?.homepageUrl,
    firstEdited.homepageUrl,
    'the later full snapshot must include the first confirmed edit',
  );
  assert.equal(
    calls[1]?.body.tools.find((tool) => tool.id === secondEdited.id)?.homepageUrl,
    secondEdited.homepageUrl,
  );

  responses[1]!.resolve(new Response(null, { status: 200 }));
  assert.deepEqual(await firstSave, { synced: true });
  assert.deepEqual(await secondSave, { synced: true });
  assert.deepEqual(marketplaceStore.getState().tools, [firstEdited, secondEdited]);
});
