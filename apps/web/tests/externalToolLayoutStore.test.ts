import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

import {
  createEmptyExternalToolLayoutDocument,
  type ExternalToolLayoutDocument,
} from '../src/domain/externalToolLayout.ts';

type ExternalLayoutStoreState = {
  document: ExternalToolLayoutDocument | null;
  draft: ExternalToolLayoutDocument | null;
  dirty: boolean;
  saving: boolean;
  hydrate: (workspaceId?: string) => Promise<boolean>;
  saveDraft: () => Promise<boolean>;
  setAllList: (
    key: 'overseasFeaturedIds',
    ids: readonly string[],
  ) => void;
};

type ExternalLayoutStore = {
  getState: () => ExternalLayoutStoreState;
};

type WorkspaceStore = {
  setState: (state: Record<string, unknown>) => void;
};

let vite: ViteDevServer;
let layoutStore: ExternalLayoutStore;
let workspaceStore: WorkspaceStore;
const originalFetch = globalThis.fetch;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  workspaceStore = (
    (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as {
      useWorkspaceStore: WorkspaceStore;
    }
  ).useWorkspaceStore;
  layoutStore = (
    (await vite.ssrLoadModule('/src/stores/externalToolLayoutStore.ts')) as {
      useExternalToolLayoutStore: ExternalLayoutStore;
    }
  ).useExternalToolLayoutStore;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('一次拖放无需进入编辑模式即可生成草稿并完成一次 CAS 自动保存', async () => {
  const workspaceId = 'ws-external-layout-auto-save';
  let serverDocument = createEmptyExternalToolLayoutDocument(4);
  let putCalls = 0;
  let getCalls = 0;

  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      putCalls += 1;
      const body = JSON.parse(String(init.body)) as {
        payload: ExternalToolLayoutDocument & { expectedRevision: number };
      };
      assert.equal(body.payload.expectedRevision, 4);
      serverDocument = {
        version: 1,
        revision: 5,
        all: body.payload.all,
        categories: body.payload.categories,
      };
      return jsonResponse({ payload: serverDocument });
    }
    getCalls += 1;
    return jsonResponse({ payload: serverDocument });
  }) as typeof fetch;

  workspaceStore.setState({
    workspaceId,
    apiConnected: true,
    apiStatus: 'connected',
  });
  assert.equal(await layoutStore.getState().hydrate(workspaceId), true);
  assert.equal(layoutStore.getState().draft, null);

  layoutStore
    .getState()
    .setAllList('overseasFeaturedIds', ['tool-gemini', 'tool-claude']);
  assert.equal(layoutStore.getState().dirty, true);
  assert.deepEqual(layoutStore.getState().draft?.all.overseasFeaturedIds, [
    'tool-gemini',
    'tool-claude',
  ]);

  assert.equal(await layoutStore.getState().saveDraft(), true);
  assert.equal(putCalls, 1);
  assert.equal(getCalls, 2, '只允许初次 hydrate 与 PUT 后确认各读取一次');
  assert.equal(layoutStore.getState().document?.revision, 5);
  assert.deepEqual(layoutStore.getState().document?.all.overseasFeaturedIds, [
    'tool-gemini',
    'tool-claude',
  ]);
  assert.equal(layoutStore.getState().draft, null);
  assert.equal(layoutStore.getState().dirty, false);
  assert.equal(layoutStore.getState().saving, false);
});
