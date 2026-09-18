import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { strFromU8, unzipSync } from 'fflate';
import { createServer, type ViteDevServer } from 'vite';

import { buildRar4, buildRar5 } from './rarFixture.ts';

type Extractor = { getFileList: () => unknown; extract: () => unknown };
type OpenArchive = (data: ArrayBuffer) => Promise<Extractor>;

type RarPackageModule = {
  convertRarToZip: (data: ArrayBuffer, openArchive: OpenArchive) => Promise<Uint8Array>;
  rarFileToZipFile: (file: File) => Promise<File>;
  rarZipFileName: (name: string) => string;
};

type RarUploadModule = {
  isRarPackageName: (name: string) => boolean;
  normalizePackageUploadFile: (file: File) => Promise<File>;
};

type SkillExportModule = {
  parseSkillUpload: (
    file: File,
  ) => Promise<Array<{ name?: string; desc?: string; instructions?: string }>>;
};

// 与浏览器一致：wasm 以二进制传给 node-unrar-js，而不是让它按文件路径自行加载。
const require = createRequire(import.meta.url);
const unrar = require('node-unrar-js') as {
  createExtractorFromData: (options: { data: ArrayBuffer; wasmBinary: ArrayBuffer }) => Promise<Extractor>;
};
const wasmFile = readFileSync(require.resolve('node-unrar-js/esm/js/unrar.wasm'));
const wasmBinary = toArrayBuffer(wasmFile);
const openArchive: OpenArchive = (data) => unrar.createExtractorFromData({ data, wasmBinary });

const SKILL_MD = '---\nname: demo-skill\ndescription: 演示 Skill\n---\n\n# Demo\n正文内容\n';
const MIB = 1024 * 1024;
const originalFetch = globalThis.fetch;

let vite: ViteDevServer;
let rar: RarPackageModule;
let rarUpload: RarUploadModule;
let skillExport: SkillExportModule;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function unzipText(zip: Uint8Array): Record<string, string> {
  return Object.fromEntries(
    Object.entries(unzipSync(zip)).map(([path, data]) => [path, strFromU8(data)]),
  );
}

function convert(bytes: Uint8Array): Promise<Uint8Array> {
  return rar.convertRarToZip(toArrayBuffer(bytes), openArchive);
}

async function rejectsWith(promise: Promise<unknown>, code: string, message?: RegExp) {
  await assert.rejects(promise, (error: Error & { code?: string }) => {
    assert.equal(error.name, 'PackageZipError');
    assert.equal(error.code, code);
    if (message) assert.match(error.message, message);
    return true;
  });
}

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  rar = (await vite.ssrLoadModule('/src/domain/rarPackage.ts')) as RarPackageModule;
  rarUpload = (await vite.ssrLoadModule('/src/domain/rarUpload.ts')) as RarUploadModule;
  skillExport = (await vite.ssrLoadModule('/src/domain/skillExport.ts')) as SkillExportModule;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

test('RAR5 转 ZIP：保留目录结构、中文文件名与空文件，转换结果能按 Skill 包解析', async () => {
  const zip = await convert(
    buildRar5([
      { name: 'demo-skill' },
      { name: 'demo-skill/SKILL.md', data: SKILL_MD },
      { name: 'demo-skill/scripts' },
      { name: 'demo-skill/scripts/run.py', data: 'print("hi")\n' },
      { name: 'demo-skill/参考/说明.md', data: '中文内容' },
      { name: 'demo-skill/empty.txt', data: '' },
    ]),
  );
  assert.deepEqual(unzipText(zip), {
    'demo-skill/SKILL.md': SKILL_MD,
    'demo-skill/scripts/run.py': 'print("hi")\n',
    'demo-skill/参考/说明.md': '中文内容',
    'demo-skill/empty.txt': '',
  });

  const [skill] = await skillExport.parseSkillUpload(new File([zip], 'demo-skill.zip'));
  assert.equal(skill?.name, 'demo-skill');
  assert.equal(skill?.desc, '演示 Skill');
  assert.match(skill?.instructions ?? '', /正文内容/);
});

test('RAR4（Windows 反斜杠路径）同样可以转换', async () => {
  const zip = await convert(
    buildRar4([
      { name: 'demo' },
      { name: 'demo\\SKILL.md', data: SKILL_MD },
      { name: 'demo\\ref\\a.txt', data: 'aaa' },
    ]),
  );
  assert.deepEqual(unzipText(zip), { 'demo/SKILL.md': SKILL_MD, 'demo/ref/a.txt': 'aaa' });
});

test('并发转换互不串数据，失败的转换不影响后续转换', async () => {
  // 先转换一次让 WASM 单例完成初始化，之后的并发转换才会像浏览器里一样共用同一个实例
  await convert(buildRar5([{ name: 'warmup.md', data: 'ok' }]));
  const [first, broken, second] = await Promise.allSettled([
    convert(buildRar5([{ name: 'a/one.md', data: 'one' }])),
    convert(buildRar4([{ name: 'secret.md', data: 'x', encrypted: true }])),
    convert(buildRar4([{ name: 'b\\two.md', data: 'two' }])),
  ]);
  assert.equal(first.status, 'fulfilled');
  assert.deepEqual(unzipText((first as PromiseFulfilledResult<Uint8Array>).value), { 'a/one.md': 'one' });
  assert.equal(broken.status, 'rejected');
  assert.equal(second.status, 'fulfilled');
  assert.deepEqual(unzipText((second as PromiseFulfilledResult<Uint8Array>).value), { 'b/two.md': 'two' });
});

test('拒绝路径穿越、绝对路径与盘符路径', async () => {
  for (const name of ['../evil.md', 'a/../../evil.md', '/abs.md', 'C:/drive.md']) {
    await rejectsWith(convert(buildRar5([{ name, data: 'x' }])), 'unsafe_path', /RAR 包含不安全路径/);
  }
});

test('拒绝加密条目与分卷包', async () => {
  await rejectsWith(
    convert(buildRar4([{ name: 'secret.md', data: 'x', encrypted: true }])),
    'encrypted_rar',
    /密码/,
  );
  await rejectsWith(convert(buildRar4([{ name: 'a.md', data: 'x' }], { volume: true })), 'multi_volume_rar', /分卷/);
  await rejectsWith(convert(buildRar5([{ name: 'a.md', data: 'x' }], { volume: true })), 'multi_volume_rar', /分卷/);
});

test('按文件头拦截超限包，不做解压', async () => {
  await rejectsWith(
    convert(buildRar5([{ name: 'big.bin', data: 'x', declaredSize: 300 * MIB }])),
    'single_file_too_large',
  );
  // 超过 4GB 的大小字段不能被截断成小数字
  await rejectsWith(
    convert(buildRar5([{ name: 'big.bin', data: 'x', declaredSize: 2 ** 32 + 16 }])),
    'single_file_too_large',
  );
  await rejectsWith(
    convert(buildRar5([{ name: 'bomb.bin', data: 'x', declaredSize: 20 * MIB }])),
    'suspicious_ratio',
  );
  await rejectsWith(
    convert(
      buildRar5(
        Array.from({ length: 40 }, (_, i) => ({ name: `f${i}.bin`, data: 'x', declaredSize: 15 * MIB })),
      ),
    ),
    'expanded_too_large',
  );
  await rejectsWith(
    convert(buildRar5(Array.from({ length: 2_001 }, (_, i) => ({ name: `f${i}.md`, data: 'x' })))),
    'too_many_files',
  );
});

test('非 RAR 内容、损坏数据、空包与重复路径给出明确提示', async () => {
  await rejectsWith(convert(new TextEncoder().encode('not a rar file')), 'invalid_rar', /内容不是 RAR/);

  const damaged = buildRar5([{ name: 'a.md', data: 'hello world' }]);
  const dataAt = Buffer.from(damaged).indexOf('hello world');
  damaged[dataAt] ^= 0xff;
  await rejectsWith(convert(damaged), 'invalid_rar', /已损坏/);

  await rejectsWith(convert(buildRar5([{ name: 'only-dir' }])), 'empty_archive');
  await rejectsWith(
    convert(buildRar5([{ name: 'a.md', data: 'x' }, { name: 'a.md', data: 'y' }])),
    'duplicate_path',
  );
});

test('解压组件加载失败时提示刷新或改用 ZIP', async () => {
  await rejectsWith(
    rar.convertRarToZip(toArrayBuffer(buildRar5([{ name: 'a.md', data: 'x' }])), () =>
      Promise.reject(new Error('wasm blocked')),
    ),
    'rar_unavailable',
    /改用 ZIP/,
  );
});

test('文件入口：.rar 转成同名 .zip，其他文件原样返回', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) =>
    String(input).includes('unrar.wasm')
      ? new Response(wasmFile)
      : originalFetch(input)) as typeof fetch;

  const source = new File([buildRar5([{ name: 'demo/SKILL.md', data: SKILL_MD }])], 'Demo.Skill.RAR');
  const converted = await rarUpload.normalizePackageUploadFile(source);
  assert.equal(converted.name, 'Demo.Skill.zip');
  assert.equal(converted.type, 'application/zip');
  assert.deepEqual(unzipText(new Uint8Array(await converted.arrayBuffer())), {
    'demo/SKILL.md': SKILL_MD,
  });

  const zipFile = new File(['x'], 'demo.zip');
  assert.equal(await rarUpload.normalizePackageUploadFile(zipFile), zipFile);
  assert.equal(rarUpload.isRarPackageName(' demo.Rar '), true);
  assert.equal(rarUpload.isRarPackageName('demo.rar.zip'), false);
  assert.equal(rar.rarZipFileName('my.skill.rar'), 'my.skill.zip');
});
