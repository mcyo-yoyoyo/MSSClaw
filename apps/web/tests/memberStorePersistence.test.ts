import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

type Member = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'capability_ops' | 'business_user' | 'viewer';
  avatar: string;
  lastActive: string;
  status: 'active' | 'invited' | 'suspended';
  deptIds: string[];
  regionId: string | null;
};

type SettingsStore = {
  getState: () => {
    workspaceId: string;
    members: Member[];
    toast: string | null;
    updateMemberRole: (memberId: string, role: Member['role']) => void;
    updateMemberOrg: (memberId: string, patch: { deptIds?: string[] }) => void;
  };
  setState: (state: Record<string, unknown>) => void;
};

type SettingsModule = {
  useSettingsStore: SettingsStore;
  hydrateMembersFromServer: (workspaceId: string) => Promise<Member[]>;
};

type WorkspaceStore = {
  setState: (state: Record<string, unknown>) => void;
};

let vite: ViteDevServer;
let settingsModule: SettingsModule;
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
  settingsModule = (await vite.ssrLoadModule('/src/stores/settingsStore.ts')) as SettingsModule;
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

function member(patch: Partial<Member> = {}): Member {
  return {
    id: 'u-custom',
    name: 'Custom User',
    email: 'custom@huawei.com',
    role: 'business_user',
    avatar: 'bg-zinc-700',
    lastActive: '刚刚',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
    ...patch,
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor timeout');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function connectWorkspace(workspaceId: string) {
  workspaceStore.setState({
    workspaceId,
    apiConnected: true,
    apiStatus: 'connected',
  });
}

test('409 后淘汰同一工作区中已经排队的旧成员快照', async () => {
  const workspaceId = 'ws-member-cas-conflict';
  const initial = member();
  const remoteAfterConflict = member({
    name: 'Remote Winner',
    role: 'capability_ops',
    deptIds: ['service'],
  });
  let getCalls = 0;
  let putCalls = 0;

  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      putCalls += 1;
      return jsonResponse({ error: 'members_revision_conflict' }, 409);
    }
    getCalls += 1;
    return getCalls === 1
      ? jsonResponse({ payload: { members: [initial], revision: 1 } })
      : jsonResponse({ payload: { members: [remoteAfterConflict], revision: 2 } });
  }) as typeof fetch;

  connectWorkspace(workspaceId);
  const hydrated = await settingsModule.hydrateMembersFromServer(workspaceId);
  settingsModule.useSettingsStore.setState({ workspaceId, members: hydrated, toast: null });

  // 两次操作同步入队；第一笔 409 后，第二笔陈旧整表快照不得借新 revision 再写。
  settingsModule.useSettingsStore.getState().updateMemberRole('u-custom', 'viewer');
  settingsModule.useSettingsStore
    .getState()
    .updateMemberOrg('u-custom', { deptIds: ['mkt'] });

  await waitFor(() => getCalls === 2);
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(putCalls, 1);
  const current = settingsModule.useSettingsStore
    .getState()
    .members.find((item) => item.id === 'u-custom');
  assert.equal(current?.name, 'Remote Winner');
  assert.equal(current?.role, 'capability_ops');
  assert.deepEqual(current?.deptIds, ['service']);
});

test('fresh GET 失败后禁止把回退成员快照写回服务端', async () => {
  const workspaceId = 'ws-member-hydrate-failure';
  let getCalls = 0;
  let putCalls = 0;

  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'PUT') {
      putCalls += 1;
      return jsonResponse({ payload: { members: [], revision: 5 } });
    }
    getCalls += 1;
    if (getCalls === 1) {
      return jsonResponse({ payload: { members: [member()], revision: 4 } });
    }
    return jsonResponse({ error: 'temporary_failure' }, 503);
  }) as typeof fetch;

  connectWorkspace(workspaceId);
  const hydrated = await settingsModule.hydrateMembersFromServer(workspaceId);
  settingsModule.useSettingsStore.setState({ workspaceId, members: hydrated, toast: null });

  const fallback = await settingsModule.hydrateMembersFromServer(workspaceId);
  settingsModule.useSettingsStore.setState({ workspaceId, members: fallback, toast: null });
  settingsModule.useSettingsStore.getState().updateMemberRole('u-custom', 'viewer');

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(putCalls, 0);
  assert.equal(
    settingsModule.useSettingsStore.getState().members.find((item) => item.id === 'u-custom')?.role,
    'business_user',
  );
  assert.match(settingsModule.useSettingsStore.getState().toast ?? '', /已阻止保存/);
});
