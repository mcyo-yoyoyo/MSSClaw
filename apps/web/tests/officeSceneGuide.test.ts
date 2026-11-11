import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';
import { buildAppRoute, parseAppRoute } from '../src/domain/appRoute.ts';
let vite: ViteDevServer;
let mod: typeof import('../src/domain/internalOfficeScenes.ts');
before(async () => { vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' }); mod = await vite.ssrLoadModule('/src/domain/internalOfficeScenes.ts') as typeof mod; });
after(async () => { await vite.close(); });
const entry = { id: 'scene-a', label: 'A', english: '', description: '', icon: 'fa-cube', visible: true, toolIds: ['tool-a'], toolBlurbs: {}, guideUrl: 'https://guide.example/a' };
test('scene guidance overrides tool docs only for its bound tool and visible scene', () => {
  const entries = [entry, { ...entry, id: 'scene-b', guideUrl: 'https://guide.example/b' }];
  assert.equal(mod.resolveOfficeGuideUrl('tool-a', 'https://tool.example/docs', 'scene-a', entries), entry.guideUrl);
  assert.equal(mod.resolveOfficeGuideUrl('tool-a', 'https://tool.example/docs', 'scene-b', entries), entries[1].guideUrl);
  for (const sceneId of [undefined, 'missing']) assert.equal(mod.resolveOfficeGuideUrl('tool-a', 'https://tool.example/docs', sceneId, entries), 'https://tool.example/docs');
  assert.equal(mod.resolveOfficeGuideUrl('other-tool', 'https://tool.example/docs', 'scene-a', entries), 'https://tool.example/docs');
  for (const patch of [{ guideUrl: '' }, { visible: false }, { guideUrl: 'javascript:alert(1)' }]) assert.equal(mod.resolveOfficeGuideUrl('tool-a', 'https://tool.example/docs', 'scene-a', [{ ...entry, ...patch }]), 'https://tool.example/docs');
});
test('guidance accepts internal HTTP(S) and rejects executable URLs or credentials', () => {
  for (const value of ['', 'https://intranet/guide', ' http://10.0.0.1/help ']) assert.equal(mod.isValidOfficeGuideUrl(value), true);
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//host/help', 'https://user:pass@host', 'invalid']) assert.equal(mod.isValidOfficeGuideUrl(value), false);
});
test('scene origin survives detail URL round trip and materialization', () => {
  const params = { view: 'market-tool' as const, type: 'tool' as const, id: 'tool-a', sceneId: entry.id };
  assert.deepEqual(parseAppRoute(buildAppRoute(params)), params);
  const tool = { id: 'tool-a', name: 'Tool', desc: '', published: true } as Parameters<typeof mod.materializeOfficeScenes>[1][number];
  assert.equal(mod.materializeOfficeScenes([entry], [tool])[0].tools[0].sceneId, entry.id);
});
