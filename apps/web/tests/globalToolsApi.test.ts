import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

type CenterApiModule = {
  fetchTools: (workspaceId?: string) => Promise<Array<{ id: string; description: string; status: string }>>;
};
type StorageModule = {
  loadTools: (options?: { throwOnRemoteError?: boolean }) => Promise<{ tools: unknown[] }>;
};

let vite: ViteDevServer;
let fetchTools: CenterApiModule['fetchTools'];
let loadTools: StorageModule['loadTools'];
const originalFetch = globalThis.fetch;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  ({ fetchTools } = (await vite.ssrLoadModule('/src/api/centerApi.ts')) as CenterApiModule);
  ({ loadTools } = (await vite.ssrLoadModule('/src/domain/persistence/storage.ts')) as StorageModule);
  const { useWorkspaceStore } = (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as {
    useWorkspaceStore: { setState: (state: Record<string, unknown>) => void };
  };
  useWorkspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

test('legacy Tool API uses the global endpoint and keeps mixed record shapes', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({
        tools: [
          {
            id: 'legacy-tool',
            name: 'LEGACY',
            displayName: 'Legacy',
            description: 'old shape',
            type: 'http',
            status: 'active',
            version: '1.0',
            endpoint: 'https://legacy.example.com',
            credentialType: 'none',
            credentialLabel: 'None',
            rateLimit: '10/min',
            timeoutMs: 1000,
            usedBySkills: [],
            usedByAgents: [],
            tags: [],
            updatedAt: '2026-01-01',
            author: 'test',
          },
          {
            id: 'market-tool',
            name: 'Market',
            desc: 'new shape',
            category: 'external',
            published: true,
            invokes: 0,
            icon: 'fa-cube',
            tags: ['external'],
            sourceType: 'external',
            homepageUrl: 'https://market.example.com',
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  const tools = await fetchTools('workspace-that-must-be-ignored');
  assert.deepEqual(calls, ['/api/v1/tools']);
  assert.deepEqual(tools.map((tool) => tool.id), ['legacy-tool', 'market-tool']);
  assert.equal(tools[1]?.description, 'new shape');
  assert.equal(tools[1]?.status, 'active');
});

test('legacy Tool API falls back when the online payload has no tools array', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  const tools = await fetchTools();
  assert.ok(tools.length > 0);
  assert.equal(tools[0]?.id, 'tool-sap');
});

test('marketplace global loader rejects a malformed online payload in strict mode', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  await assert.rejects(
    () => loadTools({ throwOnRemoteError: true }),
    /invalid_tools_payload/,
  );
});
