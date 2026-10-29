import assert from 'node:assert/strict';
import test from 'node:test';
import { readHowtoUploadFile } from '../src/domain/howtoUpload.ts';

test('How to accepts 100 MiB and rejects larger files before reading', async () => {
  const original = globalThis.FileReader;
  let reads = 0;
  globalThis.FileReader = class {
    readAsDataURL() {
      reads++;
      this.result = 'data:application/pdf;base64,JVBERg==';
      this.onload();
    }
  };
  try {
    const file = { name: 'guide.pdf', type: 'application/pdf', size: 100 * 1024 * 1024 };
    const result = await readHowtoUploadFile(file, 'pdf');
    assert.equal(result.size, file.size);
    await assert.rejects(readHowtoUploadFile({ ...file, size: file.size + 1 }, 'pdf'), /100MB/);
    assert.equal(reads, 1);
  } finally {
    if (original === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = original;
  }
});
