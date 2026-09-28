import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { BlobStoreService } from '../dist/persistence/blob-store.service.js';
import { PersistenceController } from '../dist/persistence/persistence.controller.js';

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
    putPackageStream: async (_workspaceId, input) => {
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
  await ordinary.controller.putPackageBlob('ws-test', request());
  assert.equal(ordinary.calls[0].maxBytes, undefined);

  for (const role of ['capability_ops', 'super_admin']) {
    const ops = controllerFor(role);
    await ops.controller.putOpsPackageBlob(
      'ws-test',
      request(),
      'Bearer valid-session',
      undefined,
    );
    assert.equal(ops.calls[0].maxBytes, null);
  }

  const user = controllerFor('business_user');
  await assert.rejects(
    user.controller.putOpsPackageBlob(
      'ws-test',
      request(),
      'Bearer valid-session',
      undefined,
    ),
    (error) => error?.getStatus?.() === 403,
  );

  const anonymous = controllerFor('', false);
  await assert.rejects(
    anonymous.controller.putOpsPackageBlob('ws-test', request(), undefined, undefined),
    (error) => error?.getStatus?.() === 401,
  );
});

test('BlobStore 仍限制普通流，但允许已鉴权运营流显式不设上限', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mssclaw-package-upload-'));
  const previousRoot = process.env.BLOB_ROOT;
  const previousLimit = process.env.PACKAGE_BLOB_MAX_BYTES;
  process.env.BLOB_ROOT = dir;
  process.env.PACKAGE_BLOB_MAX_BYTES = '2';
  try {
    const store = new BlobStoreService();
    await assert.rejects(
      store.putPackageStream('ws-test', {
        name: 'limited.zip',
        stream: Readable.from([Buffer.from('abc')]),
      }),
      /package_blob_too_large:2/,
    );
    const uploaded = await store.putPackageStream('ws-test', {
      name: 'ops.zip',
      stream: Readable.from([Buffer.from('abc')]),
      maxBytes: null,
    });
    assert.equal(uploaded.size, 3);
  } finally {
    if (previousRoot === undefined) delete process.env.BLOB_ROOT;
    else process.env.BLOB_ROOT = previousRoot;
    if (previousLimit === undefined) delete process.env.PACKAGE_BLOB_MAX_BYTES;
    else process.env.PACKAGE_BLOB_MAX_BYTES = previousLimit;
    await rm(dir, { recursive: true, force: true });
  }
});
