import assert from 'node:assert/strict';
import test from 'node:test';
import { skillDownloadUrl } from '../src/domain/skillDownload.ts';
test('download destination accepts public/internal HTTP(S), trims and falls back for absent or unsafe URLs', () => {
  for (const url of ['https://downloads.example/skill.zip', 'http://intranet/files', 'https://10.0.0.1/download']) assert.equal(skillDownloadUrl(` ${url} `), url);
  for (const url of [undefined, '', '  ', 'javascript:alert(1)', '//host/file', 'https://user:pass@host/file', 'invalid', 'https://' + 'a'.repeat(2048)]) assert.equal(skillDownloadUrl(url), null);
});
