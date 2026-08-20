import assert from 'node:assert/strict';
import test from 'node:test';

import { REGIONS, unrestrictedRegionMatchesSelection } from '../src/domain/orgTaxonomy.ts';

test('不限区域的 Skill 命中任意具体区域筛选', () => {
  for (const region of REGIONS) {
    const selected = [region.id];
    assert.equal(unrestrictedRegionMatchesSelection(null, selected), true);
    assert.equal(unrestrictedRegionMatchesSelection(undefined, selected), true);
  }
});

test('不限区域与未选择区域筛选均保持可见', () => {
  assert.equal(unrestrictedRegionMatchesSelection(null, []), true);
  assert.equal(unrestrictedRegionMatchesSelection('latam', []), true);
});

test('指定区域的 Skill 仍只命中对应区域', () => {
  assert.equal(unrestrictedRegionMatchesSelection('latam', ['latam']), true);
  assert.equal(unrestrictedRegionMatchesSelection('latam', ['europe']), false);
  assert.equal(unrestrictedRegionMatchesSelection('latam', ['europe', 'latam']), true);
});
