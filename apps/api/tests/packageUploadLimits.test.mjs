import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import test from 'node:test';

import { BlobStoreService } from '../dist/persistence/blob-store.service.js';
import { PersistenceController } from '../dist/persistence/persistence.controller.js';
import { OptionalApiKeyGuard } from '../dist/common/optional-api-key.guard.js';

function request() {
  const headers = { 'x-file-name': 'demo.zip', 'content-length': '3' };
  return {
    header(name) {
      return headers[name.toLowerCase()];
    },
  };
}

function controllerFor(role, ok = true) {
  const calls = [];
  const blobs = {
    putPackageStream: async (input) => {
      calls.push(input);
      return { id: 'blob' };
    },
  };
  const docs = {
    me: async () => ok
      ? { ok: true, user: { platformRole: role } }
      : { ok: false, error: 'invalid_session' },
  };
  return {
    calls,
    controller: new PersistenceController({}, blobs, docs),
  };
}

test('普通上传保留上限，运营端点只向后台角色传无限策略', async () => {
  const ordinary = controllerFor('business_user');
  await ordinary.controller.putPackageBlob(request());
  assert.equal(ordinary.calls[0].maxBytes, undefined);

  for (const role of ['capability_ops', 'super_admin']) {
    const ops = controllerFor(role);
    await ops.controller.putOpsPackageBlob(
      request(),
      'Bearer valid-session',
      undefined,
    );
    assert.equal(ops.calls[0].maxBytes, null);
  }

  const user = controllerFor('business_user');
  await assert.rejects(
    user.controller.putOpsPackageBlob(
      request(),
      'Bearer valid-session',
      undefined,
    ),
    (error) => error?.getStatus?.() === 403,
  );

  const anonymous = controllerFor('', false);
  await assert.rejects(
    anonymous.controller.putOpsPackageBlob(request(), undefined, undefined),
    (error) => error?.getStatus?.() === 401,
  );
});

// 需要本机 MinIO：docker compose -f deploy/docker-compose.infra.yml up -d
const S3_DEFAULTS = {
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_BUCKET: 'mssclaw',
  S3_ACCESS_KEY: 'mssclaw',
  S3_SECRET_KEY: 'mssclaw_dev_secret',
};
for (const [name, value] of Object.entries(S3_DEFAULTS)) process.env[name] ??= value;

async function readAll(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

test('BlobStore 仍限制普通流，但允许已鉴权运营流显式不设上限', async () => {
  const previousLimit = process.env.PACKAGE_BLOB_MAX_BYTES;
  process.env.PACKAGE_BLOB_MAX_BYTES = '2';
  try {
    const store = new BlobStoreService();
    await store.onModuleInit();
    await assert.rejects(
      store.putPackageStream({
        name: 'limited.zip',
        stream: Readable.from([Buffer.from('abc')]),
      }),
      /package_blob_too_large:2/,
    );
    const uploaded = await store.putPackageStream({
      name: 'ops.zip',
      stream: Readable.from([Buffer.from('a'), Buffer.from('bc')]),
      maxBytes: null,
    });
    assert.equal(uploaded.size, 3);
    const fetched = await store.get(uploaded.id);
    assert.equal(fetched.meta.name, 'ops.zip');
    assert.equal(await readAll(fetched.stream), 'abc');
    await store.delete(uploaded.id, uploaded.deleteToken);
  } finally {
    if (previousLimit === undefined) delete process.env.PACKAGE_BLOB_MAX_BYTES;
    else process.env.PACKAGE_BLOB_MAX_BYTES = previousLimit;
  }
});

test('BlobStore 对象存储往返：上传、读取、删除凭证校验', async () => {
  const store = new BlobStoreService();
  const uploaded = await store.putBase64({
    name: '说明.txt',
    mimeType: 'text/plain',
    dataBase64: Buffer.from('hello').toString('base64'),
  });
  const fetched = await store.get(uploaded.id);
  assert.equal(fetched.meta.name, '说明.txt');
  assert.equal(fetched.size, 5);
  assert.equal(await readAll(fetched.stream), 'hello');

  await assert.rejects(
    store.delete(uploaded.id, 'x'.repeat(43)),
    /blob_delete_denied/,
  );
  await store.delete(uploaded.id, uploaded.deleteToken);
  await assert.rejects(store.get(uploaded.id), (error) => error?.getStatus?.() === 404);
  await assert.rejects(store.delete(uploaded.id, uploaded.deleteToken), /blob_not_found/);
});

test('BlobStore 缺少对象存储配置时直接报错', () => {
  const previous = process.env.S3_BUCKET;
  delete process.env.S3_BUCKET;
  try {
    assert.throws(() => new BlobStoreService(), /S3_BUCKET 未配置/);
  } finally {
    process.env.S3_BUCKET = previous;
  }
});

test('开启 API Key 时，单个 blob 只有栅格图片免校验，其他类型和接口仍需 Key', async () => {
  const previous = process.env.API_KEY;
  process.env.API_KEY = 'secret-key';
  const blobPath = `/api/v1/blobs/${'a'.repeat(32)}`;
  const req = (method, path, key) => ({
    method,
    path,
    header: (name) => (name.toLowerCase() === 'x-api-key' ? key : undefined),
  });
  const context = (r) => ({ switchToHttp: () => ({ getRequest: () => r }) });
  const serve = (mimeType, key) => {
    const stream = Readable.from([Buffer.from('x')]);
    const blobs = { get: async () => ({ meta: { name: 'f', mimeType }, size: 1, stream }) };
    const res = Object.assign(new PassThrough(), { setHeader() {} });
    const done = new PersistenceController({}, blobs, {})
      .getBlob('a'.repeat(32), req('GET', blobPath, key), res);
    return { done, stream };
  };
  const is401 = (e) => e?.getStatus?.() === 401;
  try {
    const guard = new OptionalApiKeyGuard();
    assert.equal(guard.canActivate(context(req('GET', blobPath))), true);
    assert.throws(() => guard.canActivate(context(req('DELETE', blobPath))), is401);
    assert.throws(() => guard.canActivate(context(req('GET', '/api/v1/tools'))), is401);
    assert.equal(guard.canActivate(context(req('GET', '/api/v1/tools', 'secret-key'))), true);

    await serve('image/png').done;
    await serve('application/zip', 'secret-key').done;
    const denied = serve('application/zip');
    await assert.rejects(denied.done, is401);
    assert.equal(denied.stream.destroyed, true, '拒绝时要关闭对象存储响应流');
    await assert.rejects(serve('image/svg+xml').done, is401);
  } finally {
    if (previous === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = previous;
  }
});

test('去租户前的文件地址永久跳到新地址，非法 id 直接 404', () => {
  let redirected;
  const res = { redirect: (status, location) => { redirected = { status, location }; } };
  const controller = new PersistenceController({}, {}, {});
  controller.legacyBlobRedirect('b'.repeat(32), res);
  assert.deepEqual(redirected, { status: 301, location: `/api/v1/blobs/${'b'.repeat(32)}` });
  assert.throws(() => controller.legacyBlobRedirect('../../etc', res), (e) => e?.getStatus?.() === 404);
});
