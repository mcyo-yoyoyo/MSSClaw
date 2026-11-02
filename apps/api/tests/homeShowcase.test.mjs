import assert from 'node:assert/strict';
import test from 'node:test';
import { readHomeFeaturedConfig, selectHomeAssets } from '../dist/persistence/home-showcase.js';

const tool = (id, extra = {}) => ({ id, name: id, published: true, ...extra });
const skill = (id, extra = {}) => ({ id, name: id, published: true, versions: [{ version: '1.0' }], packageBlob: { id: 'blob' }, ...extra });
const agent = (id, extra = {}) => ({ id, name: id, published: true, packageBlob: { id: 'blob' }, planSteps: ['a'], ...extra });

test('还没保存过首页配置时，revision 0 不视为已配置', () => {
  assert.deepEqual(readHomeFeaturedConfig(undefined), { configured: false, channels: null });
  assert.deepEqual(
    readHomeFeaturedConfig({
      revision: 0,
      channels: { external: ['tool-a'], internal: [], projects: [] },
    }),
    { configured: false, channels: null },
  );
});

test('已保存的首页配置只带回三栏引用的资产，并去掉安装包', () => {
  const config = readHomeFeaturedConfig({
    revision: 2,
    channels: {
      external: ['tool-b', 'not-a-real-tool'],
      internal: ['tool-a'],
      projects: ['skill:skill-b', 'agent:agent-a', 'broken'],
    },
  });
  assert.equal(config.configured, true);
  const picked = selectHomeAssets({
    ...config,
    tools: [tool('tool-a'), tool('tool-b'), tool('tool-c')],
    skills: [skill('skill-a'), skill('skill-b', { published: false })],
    agents: [agent('agent-a'), agent('agent-b')],
  });
  assert.deepEqual(picked.tools.map((item) => item.id), ['tool-a', 'tool-b']);
  assert.deepEqual(picked.skills.map((item) => item.id), ['skill-b']);
  assert.equal(picked.skills[0].published, false);
  assert.equal('versions' in picked.skills[0], false);
  assert.equal('packageBlob' in picked.skills[0], false);
  assert.deepEqual(picked.agents.map((item) => item.id), ['agent-a']);
  assert.equal('planSteps' in picked.agents[0], false);
});

test('未保存首页配置时返回全部工具和已上架的 Skill、Agent', () => {
  const picked = selectHomeAssets({
    configured: false,
    channels: null,
    tools: [tool('tool-off', { published: false }), tool('tool-on')],
    skills: [skill('skill-on'), skill('skill-off', { published: false })],
    agents: [agent('agent-on'), agent('agent-off', { published: false })],
  });
  assert.deepEqual(picked.tools.map((item) => item.id), ['tool-off', 'tool-on']);
  assert.deepEqual(picked.skills.map((item) => item.id), ['skill-on']);
  assert.equal('versions' in picked.skills[0], false);
  assert.deepEqual(picked.agents.map((item) => item.id), ['agent-on']);
});
