import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

import {
  announcementTagChipStyle,
  announcementTagColor,
  normalizeAnnouncementColor,
  normalizeAnnouncementTag,
} from '../src/domain/stationAnnouncementTags.ts';
import {
  clampTickerIndex,
  nextTickerIndex,
  prevTickerIndex,
} from '../src/domain/stationTicker.ts';

test('公告标签是自填文本：去空白、补历史枚举前缀、限长，允许留空', () => {
  assert.equal(normalizeAnnouncementTag('  维护  '), '维护');
  assert.equal(normalizeAnnouncementTag('上线'), 'AI上线');
  assert.equal(normalizeAnnouncementTag('培训'), 'AI培训');
  assert.equal(normalizeAnnouncementTag(''), '');
  assert.equal(normalizeAnnouncementTag(undefined), '');
  assert.equal(normalizeAnnouncementTag('十三个字的超长标签内容').length <= 12, true);
});

test('没选颜色时按标签文字自动取色，老枚举保持原配色', () => {
  assert.equal(announcementTagColor('维护'), announcementTagColor('维护'));
  assert.equal(announcementTagColor('AI上线'), '#c8102e');
  assert.equal(announcementTagColor('AI培训'), '#e85d04');
  assert.equal(announcementTagColor('上线'), '#c8102e');
  // 空标签不渲染，但取色不能抛错
  assert.match(announcementTagColor(''), /^#[0-9a-f]{6}$/);
});

test('运营选定的颜色覆盖自动取色，非法色值回落自动', () => {
  assert.equal(announcementTagColor('维护', '#0369A1'), '#0369a1');
  assert.equal(announcementTagColor('维护', '#abc'), '#aabbcc');
  // 任意字符串不能写进样式，否则就是一个注入面
  assert.equal(announcementTagColor('AI上线', 'red; content:bad'), '#c8102e');
  assert.equal(normalizeAnnouncementColor('not-a-color'), '');
  assert.deepEqual(announcementTagChipStyle('#0369a1'), {
    color: '#0369a1',
    backgroundColor: '#0369a11a',
  });
});

test('公告条翻页索引始终落在列表内', () => {
  assert.equal(clampTickerIndex(5, 3), 2);
  assert.equal(clampTickerIndex(-1, 3), 2);
  assert.equal(clampTickerIndex(2, 0), 0);
  assert.equal(nextTickerIndex(2, 3), 0);
  assert.equal(prevTickerIndex(0, 3), 2);
  assert.equal(nextTickerIndex(0, 1), 0);
  assert.equal(prevTickerIndex(0, 0), 0);
});

type LooseStore = {
  getState: () => Record<string, any>;
  setState: (state: Record<string, unknown>) => void;
};

type AnnouncementDomain = {
  listUnreadStationAnnouncements: () => Array<{ id: string; title: string; badge: string }>;
  dismissStationAnnouncement: (id: string) => void;
};

let vite: ViteDevServer;
let workspaceStore: LooseStore;
let sessionStore: LooseStore;
let announcementStore: LooseStore;
let inboxStore: LooseStore;
let announcements: AnnouncementDomain;
const originalFetch = globalThis.fetch;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  const load = async (path: string, name: string) =>
    ((await vite.ssrLoadModule(path)) as Record<string, LooseStore>)[name];
  workspaceStore = await load('/src/stores/workspaceStore.ts', 'useWorkspaceStore');
  sessionStore = await load('/src/stores/sessionStore.ts', 'useSessionStore');
  announcementStore = await load(
    '/src/stores/stationAnnouncementStore.ts',
    'useStationAnnouncementStore',
  );
  inboxStore = await load('/src/stores/inboxStore.ts', 'useInboxStore');
  announcements = (await vite.ssrLoadModule(
    '/src/domain/stationAnnouncements.ts',
  )) as unknown as AnnouncementDomain;
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

/** 每个用例换一个 workspace，避开 platformDocsApi 的会话内缓存 */
function connect(workspaceId: string) {
  workspaceStore.setState({ workspaceId, apiConnected: true, apiStatus: 'connected' });
  sessionStore.setState({
    mode: 'user',
    isGuest: false,
    isAuthenticated: true,
    user: { id: 'u-1', name: '张三', platformRole: 'member' },
  });
}

function announcement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ann-maintenance',
    title: '系统维护通知',
    body: '本周六 22:00 起停机 2 小时。',
    badge: '维护',
    publishedAt: '2026-09-10T02:00:00.000Z',
    published: true,
    ...overrides,
  };
}

test('运营自填的标签会被保留，保存时带上 revision 并采用服务端规范化结果', async () => {
  const workspaceId = 'ws-ann-save';
  const requests: Array<{ method: string; payload?: any }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('/docs/station-announcements')) {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { payload: any };
        requests.push({ method: 'PUT', payload: body.payload });
        return jsonResponse({
          payload: { items: body.payload.items, revision: body.payload.revision + 1 },
        });
      }
      requests.push({ method: 'GET' });
      return jsonResponse({ payload: { items: [announcement()], revision: 2 } });
    }
    return jsonResponse({});
  }) as typeof fetch;

  connect(workspaceId);
  announcementStore.getState().hydrate();
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 旧实现只接受 AI上线 / AI培训 两个枚举，自填标签的公告会被整条丢弃
  assert.deepEqual(
    announcementStore.getState().items.map((a: any) => [a.id, a.badge]),
    [['ann-maintenance', '维护']],
  );
  assert.equal(announcementStore.getState().revision, 2);

  announcementStore
    .getState()
    .upsert(announcement({ id: 'ann-launch', title: '新功能上线', badge: '上线' }), true);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const put = requests.find((r) => r.method === 'PUT');
  assert.equal(put?.payload.revision, 2);
  assert.equal(put?.payload.items.length, 2);
  // 历史枚举值在写入前就补齐了 AI 前缀
  assert.equal(
    put?.payload.items.find((item: any) => item.id === 'ann-launch').badge,
    'AI上线',
  );
  assert.equal(announcementStore.getState().revision, 3);
});

test('连了后端就以库为准：空文档不再灌演示种子', async () => {
  const workspaceId = 'ws-ann-empty';
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('/docs/station-announcements')) {
      return jsonResponse({ payload: { items: [], revision: 7 } });
    }
    return jsonResponse({});
  }) as typeof fetch;

  connect(workspaceId);
  announcementStore.getState().hydrate();
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 灌种子会让首页出现库里不存在、点开也没有详情的公告
  assert.deepEqual(announcementStore.getState().items, []);
  assert.equal(announcementStore.getState().revision, 7);
  assert.equal(announcementStore.getState().loaded, true);
});

test('另一个运营先提交时拉回最新公告，不覆盖对方内容', async () => {
  const workspaceId = 'ws-ann-conflict';
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('/docs/station-announcements')) {
      if (init?.method === 'PUT') return jsonResponse({ error: 'conflict' }, 409);
      return jsonResponse({
        payload: { items: [announcement({ id: 'ann-other', title: '别人写的公告' })], revision: 9 },
      });
    }
    return jsonResponse({});
  }) as typeof fetch;

  connect(workspaceId);
  announcementStore.getState().upsert(announcement({ id: 'ann-mine', title: '我的公告' }), true);
  await new Promise((resolve) => setTimeout(resolve, 30));

  const state = announcementStore.getState();
  assert.deepEqual(state.items.map((a: any) => a.id), ['ann-other']);
  assert.equal(state.revision, 9);
  assert.match(String(state.toast), /已拉取最新内容/);
});

test('擦掉公告即标已读：写回服务端，且不再进入首页公告条', async () => {
  const workspaceId = 'ws-ann-dismiss';
  const readCalls: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('/docs/station-announcements')) {
      return jsonResponse({ payload: { items: [announcement()], revision: 1 } });
    }
    if (url.includes('/inbox/messages') && url.includes('/read')) {
      readCalls.push(url);
      return jsonResponse({ ok: true });
    }
    if (url.includes('/inbox/messages')) {
      return jsonResponse({
        messages: [
          {
            id: 'ann-maintenance',
            kind: 'announce',
            title: '系统维护通知',
            body: '本周六 22:00 起停机 2 小时。',
            fromName: '能力运营',
            toUserId: '*',
            createdAt: '2026-09-10T02:00:00.000Z',
            read: false,
          },
        ],
      });
    }
    return jsonResponse({});
  }) as typeof fetch;

  connect(workspaceId);
  announcementStore.getState().hydrate();
  inboxStore.getState().bootstrap(workspaceId);
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.deepEqual(
    announcements.listUnreadStationAnnouncements().map((a) => a.id),
    ['ann-maintenance'],
  );

  announcements.dismissStationAnnouncement('ann-maintenance');
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(readCalls.length, 1);
  assert.match(readCalls[0], /ann-maintenance\/read$/);
  assert.deepEqual(announcements.listUnreadStationAnnouncements(), []);
});

test('服务端已记为已读的公告不会再出现在首页公告条', async () => {
  const workspaceId = 'ws-ann-read';
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('/docs/station-announcements')) {
      return jsonResponse({ payload: { items: [announcement()], revision: 1 } });
    }
    if (url.includes('/inbox/messages')) {
      return jsonResponse({
        messages: [
          {
            id: 'ann-maintenance',
            kind: 'announce',
            title: '系统维护通知',
            body: '正文',
            fromName: '能力运营',
            toUserId: '*',
            createdAt: '2026-09-10T02:00:00.000Z',
            read: true,
          },
        ],
      });
    }
    return jsonResponse({});
  }) as typeof fetch;

  connect(workspaceId);
  announcementStore.getState().hydrate();
  inboxStore.getState().bootstrap(workspaceId);
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(announcementStore.getState().items.length, 1);
  assert.deepEqual(announcements.listUnreadStationAnnouncements(), []);
});
