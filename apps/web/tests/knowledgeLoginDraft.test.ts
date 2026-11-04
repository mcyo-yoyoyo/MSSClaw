import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';
let vite: ViteDevServer;
let session: any, gate: any, draft: any;
const originalWindow = globalThis.window;
before(async () => {
  globalThis.window = { addEventListener() {}, removeEventListener() {} } as any;
  vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  session = (await vite.ssrLoadModule('/src/stores/sessionStore.ts')).useSessionStore;
  gate = (await vite.ssrLoadModule('/src/stores/authGateStore.ts')).useAuthGateStore;
  draft = await vite.ssrLoadModule('/src/features/ai-knowledge/knowledgeLoginDraft.ts');
});
after(async () => { await vite?.close(); globalThis.window = originalWindow; });
const question = { text: '分析翻译方案', mode: 'insight', returnHome: true };
function start() {
  session.setState({ user: null, isAuthenticated: false });
  gate.getState().requestLogin('chat');
  draft.stageKnowledgeLoginDraft(question);
}
function login(id: string) { session.setState({ user: { id }, isAuthenticated: true }); }
test('登录切换身份后恢复完整草稿一次，游客和其他账号无法取出', () => {
  start(); assert.equal(draft.takeKnowledgeLoginDraft('guest'), null);
  login('a'); gate.getState().resolveAfterLogin();
  assert.equal(draft.takeKnowledgeLoginDraft('b'), null);
  assert.deepEqual(draft.takeKnowledgeLoginDraft('a'), question);
  assert.equal(draft.takeKnowledgeLoginDraft('a'), null);
});
test('取消登录后不会将草稿带入下次登录', () => {
  start(); gate.getState().close(); login('a');
  assert.equal(draft.takeKnowledgeLoginDraft('a'), null);
});
test('登录后未取出的草稿在退出或换账号时清理', () => {
  start(); login('a'); login('b'); assert.equal(draft.takeKnowledgeLoginDraft('b'), null);
  start(); login('a'); session.setState({ user: null, isAuthenticated: false }); login('b');
  assert.equal(draft.takeKnowledgeLoginDraft('b'), null);
});
