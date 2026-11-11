import assert from 'node:assert/strict';
import test from 'node:test';
import { formatVersion } from '../src/domain/formatVersion.ts';
test('version display has exactly one prefix, including repeatedly formatted input', () => {
 for (const value of ['1.0.0', 'v1.0.0', 'V1.0.0', 'vv1.0.0', ' Vv1.0.0 ']) {
  assert.equal(formatVersion(value), 'v1.0.0');
  assert.equal(formatVersion(formatVersion(value)), 'v1.0.0');
 }
 assert.equal(formatVersion('2.0-beta.1+build'), 'v2.0-beta.1+build');
 for(const value of [undefined,null,'',' ']) assert.equal(formatVersion(value),'—');
});
