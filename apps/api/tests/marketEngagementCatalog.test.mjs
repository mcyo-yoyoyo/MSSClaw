import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SEED_MARKET_ENGAGEMENT_STATIC_CONTENT_IDS } from '../dist/data/market-doc-seeds.js';

function idsAtFourSpaceIndent(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  return [...source.matchAll(/^    id: '([^']+)'/gm)].map((match) => match[1]);
}

test('backend engagement allowlist matches all bundled portal scenarios and content', () => {
  const frontendIds = [
    ...idsAtFourSpaceIndent('../../web/src/domain/portalMap.ts'),
    ...idsAtFourSpaceIndent('../../web/src/domain/prototype/portalContent.ts'),
  ].sort();
  const backendIds = [...SEED_MARKET_ENGAGEMENT_STATIC_CONTENT_IDS].sort();
  assert.deepEqual(backendIds, frontendIds);
});
