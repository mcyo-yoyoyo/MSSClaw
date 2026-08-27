import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

import { reorderVisibleOfficeSceneEntries } from '../src/domain/internalOfficeSceneOrder.ts';
import type { InternalOfficeSceneCatalogEntry } from '../src/domain/internalOfficeScenes.ts';

function scene(
  id: string,
  visible = true,
  marker = id,
): InternalOfficeSceneCatalogEntry {
  return {
    id,
    label: `场景 ${marker}`,
    english: marker.toUpperCase(),
    description: `说明 ${marker}`,
    icon: 'fa-cube',
    visible,
    toolIds: [],
    toolBlurbs: {},
  };
}

test('reorders visible cards and preserves hidden entries in their exact slots', () => {
  const a = scene('a');
  const hidden = scene('hidden', false, 'hidden-original');
  const b = scene('b');
  const c = scene('c');
  const entries = [a, hidden, b, c];

  const movedToFront = reorderVisibleOfficeSceneEntries(
    entries,
    'c',
    'a',
    ['a', 'b', 'c'],
  );
  assert.deepEqual(movedToFront?.map((entry) => entry.id), [
    'c',
    'hidden',
    'a',
    'b',
  ]);
  assert.equal(movedToFront?.[1], hidden, 'hidden entry must retain its slot and object');
  assert.equal(movedToFront?.[0], c, 'visible entries must retain every original field');

  const movedToEnd = reorderVisibleOfficeSceneEntries(
    entries,
    'a',
    null,
    ['a', 'b', 'c'],
  );
  assert.deepEqual(movedToEnd?.map((entry) => entry.id), [
    'b',
    'hidden',
    'c',
    'a',
  ]);
  assert.equal(movedToEnd?.[1], hidden);
});

test('rejects stale, partial, duplicated, unknown, hidden, and no-op reorder requests', () => {
  const entries = [scene('a'), scene('hidden', false), scene('b'), scene('c')];

  for (const visibleIds of [
    ['a', 'c'],
    ['a', 'b', 'b'],
    ['a', 'b', 'unknown'],
    ['b', 'a', 'c'],
  ]) {
    assert.equal(
      reorderVisibleOfficeSceneEntries(entries, 'c', 'a', visibleIds),
      null,
    );
  }
  assert.equal(
    reorderVisibleOfficeSceneEntries(entries, 'hidden', 'a', ['a', 'b', 'c']),
    null,
  );
  assert.equal(
    reorderVisibleOfficeSceneEntries(entries, 'c', 'hidden', ['a', 'b', 'c']),
    null,
  );
  assert.equal(
    reorderVisibleOfficeSceneEntries(entries, 'b', 'b', ['a', 'b', 'c']),
    null,
  );
  assert.equal(
    reorderVisibleOfficeSceneEntries(entries, 'b', 'c', ['a', 'b', 'c']),
    null,
    'already immediately before the target is a no-op',
  );
});

type OfficeSceneStoreState = {
  entries: InternalOfficeSceneCatalogEntry[];
  revision: number;
  workspaceId: string | null;
  saving: boolean;
  toast: string | null;
  hydrate: (workspaceId?: string) => Promise<boolean>;
  reorderVisibleEntry: (
    activeId: string,
    beforeId: string | null,
    visibleIds: string[],
    startRevision?: number,
  ) => Promise<boolean>;
};

type OfficeSceneStore = {
  getState: () => OfficeSceneStoreState;
  setState: (state: Partial<OfficeSceneStoreState>) => void;
};

type WorkspaceStore = {
  setState: (state: Record<string, unknown>) => void;
};

let vite: ViteDevServer;
let officeSceneStore: OfficeSceneStore;
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
  officeSceneStore = (
    (await vite.ssrLoadModule('/src/stores/internalOfficeSceneCatalogStore.ts')) as {
      useInternalOfficeSceneCatalogStore: OfficeSceneStore;
    }
  ).useInternalOfficeSceneCatalogStore;
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

function enableRemoteApi(workspaceId: string) {
  workspaceStore.setState({
    workspaceId,
    apiConnected: true,
    apiStatus: 'connected',
  });
}

function versionedDocument(
  entries: InternalOfficeSceneCatalogEntry[],
  revision = 4,
) {
  return { version: 2, revision, entries };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

test('drop performs one CAS PUT, then publishes only the fresh canonical snapshot', async () => {
  const workspaceId = 'ws-office-order-success';
  const initialEntries = [scene('a'), scene('hidden', false), scene('b'), scene('c')];
  let serverDocument = versionedDocument(initialEntries);
  const putPayloads: Array<Record<string, unknown>> = [];
  let getCalls = 0;

  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as {
        payload: Record<string, unknown> & { entries: InternalOfficeSceneCatalogEntry[] };
      };
      putPayloads.push(body.payload);
      serverDocument = versionedDocument(body.payload.entries, 5);
      return jsonResponse({ kind: 'internal-office-scenes', payload: serverDocument });
    }
    getCalls += 1;
    return jsonResponse({ kind: 'internal-office-scenes', payload: serverDocument });
  }) as typeof fetch;

  enableRemoteApi(workspaceId);
  assert.equal(await officeSceneStore.getState().hydrate(workspaceId), true);
  assert.equal(
    await officeSceneStore
      .getState()
      .reorderVisibleEntry('c', 'a', ['a', 'b', 'c'], 4),
    true,
  );

  assert.equal(putPayloads.length, 1, 'one drop must issue exactly one PUT');
  assert.equal(putPayloads[0]?.expectedRevision, 4);
  assert.equal(putPayloads[0]?.revision, 4);
  assert.deepEqual(
    (putPayloads[0]?.entries as InternalOfficeSceneCatalogEntry[]).map(
      (entry) => entry.id,
    ),
    ['c', 'hidden', 'a', 'b'],
  );
  assert.equal(getCalls, 2, 'hydrate and post-PUT confirmation are the only GETs');
  assert.deepEqual(
    officeSceneStore.getState().entries.map((entry) => entry.id),
    ['c', 'hidden', 'a', 'b'],
  );
  assert.equal(officeSceneStore.getState().revision, 5);
  assert.equal(officeSceneStore.getState().saving, false);
});

test('invalid or stale drag state does not write', async () => {
  const workspaceId = 'ws-office-order-invalid';
  const serverDocument = versionedDocument([
    scene('a'),
    scene('hidden', false),
    scene('b'),
    scene('c'),
  ]);
  let putCalls = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      putCalls += 1;
      return jsonResponse({ payload: serverDocument });
    }
    return jsonResponse({ payload: serverDocument });
  }) as typeof fetch;

  enableRemoteApi(workspaceId);
  assert.equal(await officeSceneStore.getState().hydrate(workspaceId), true);
  assert.equal(
    await officeSceneStore
      .getState()
      .reorderVisibleEntry('c', 'a', ['a', 'b', 'b'], 4),
    false,
  );
  assert.equal(
    await officeSceneStore
      .getState()
      .reorderVisibleEntry('c', 'a', ['a', 'b', 'c'], 3),
    false,
  );
  assert.equal(putCalls, 0);
  assert.match(officeSceneStore.getState().toast ?? '', /顺序已刷新/);
});

test('a 409 keeps the last confirmed order and revision', async () => {
  const workspaceId = 'ws-office-order-conflict';
  const serverDocument = versionedDocument([
    scene('a'),
    scene('hidden', false),
    scene('b'),
    scene('c'),
  ]);
  let putCalls = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      putCalls += 1;
      return jsonResponse(
        {
          error: 'internal_office_scenes_revision_conflict',
          expectedRevision: 4,
          currentRevision: 5,
        },
        409,
      );
    }
    return jsonResponse({ payload: serverDocument });
  }) as typeof fetch;

  enableRemoteApi(workspaceId);
  assert.equal(await officeSceneStore.getState().hydrate(workspaceId), true);
  assert.equal(
    await officeSceneStore
      .getState()
      .reorderVisibleEntry('c', 'a', ['a', 'b', 'c'], 4),
    false,
  );
  assert.equal(putCalls, 1);
  assert.deepEqual(
    officeSceneStore.getState().entries.map((entry) => entry.id),
    ['a', 'hidden', 'b', 'c'],
  );
  assert.equal(officeSceneStore.getState().revision, 4);
  assert.match(officeSceneStore.getState().toast ?? '', /保存冲突/);
});

test('a late response cannot publish into a newly selected workspace', async () => {
  const workspaceA = 'ws-office-order-late-a';
  const workspaceB = 'ws-office-order-late-b';
  const entriesA = [scene('a'), scene('b'), scene('c')];
  const entriesB = [scene('x'), scene('y')];
  const pendingPut = deferred<Response>();

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (init?.method === 'PUT' && url.includes(workspaceA)) {
      return pendingPut.promise;
    }
    if (url.includes(workspaceB)) {
      return jsonResponse({ payload: versionedDocument(entriesB, 8) });
    }
    return jsonResponse({ payload: versionedDocument(entriesA, 4) });
  }) as typeof fetch;

  enableRemoteApi(workspaceA);
  assert.equal(await officeSceneStore.getState().hydrate(workspaceA), true);
  const saving = officeSceneStore
    .getState()
    .reorderVisibleEntry('c', 'a', ['a', 'b', 'c'], 4);

  enableRemoteApi(workspaceB);
  assert.equal(await officeSceneStore.getState().hydrate(workspaceB), true);
  pendingPut.resolve(
    jsonResponse({ payload: versionedDocument([scene('c'), scene('a'), scene('b')], 5) }),
  );
  assert.equal(await saving, false);

  assert.equal(officeSceneStore.getState().workspaceId, workspaceB);
  assert.equal(officeSceneStore.getState().revision, 8);
  assert.deepEqual(
    officeSceneStore.getState().entries.map((entry) => entry.id),
    ['x', 'y'],
  );
});
