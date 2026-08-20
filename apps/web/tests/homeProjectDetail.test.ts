import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveHomeProjectDetailTarget } from '../src/domain/homeProjectDetail.ts';
import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
} from '../src/domain/prototype/types.ts';

const skill = { id: 'skill-translate', title: '小语种翻译' } as PrototypeSkillSeed;
const agent = { id: 'agent-marketing', name: '营销 Agent' } as PrototypeAgentSeed;

test('home AI Hub Skill card resolves directly to the Skill detail target', () => {
  const target = resolveHomeProjectDetailTarget(skill.id, [skill], [agent]);

  assert.deepEqual(target, { kind: 'skill', item: skill });
});

test('home AI Hub Agent card resolves directly to the Agent detail target', () => {
  const target = resolveHomeProjectDetailTarget(agent.id, [skill], [agent]);

  assert.deepEqual(target, { kind: 'agent', item: agent });
});

test('unknown AI Hub card does not resolve to an unrelated detail', () => {
  assert.equal(resolveHomeProjectDetailTarget('missing', [skill], [agent]), null);
});

test('Skill wins deterministically if legacy data reuses an id', () => {
  const duplicateAgent = { ...agent, id: skill.id };

  assert.deepEqual(
    resolveHomeProjectDetailTarget(skill.id, [skill], [duplicateAgent]),
    { kind: 'skill', item: skill },
  );
});
