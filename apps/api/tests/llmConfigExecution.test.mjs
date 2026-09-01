import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecutionsService } from '../dist/executions/executions.service.js';
import { ExecutionsController } from '../dist/executions/executions.controller.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';
import {
  nestLlmConfigFromDoc,
  nestLlmConfigFromCandidate,
} from '../dist/executions/llm.client.js';

const originalFetch = globalThis.fetch;
const originalEnv = {
  baseUrl: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,
};

function fakePrisma(payload) {
  const writes = [];
  return {
    writes,
    centerRecord: {
      findUnique: async () => ({ payload }),
      upsert: async (args) => writes.push(args),
    },
    $executeRaw: async () => 1,
  };
}

function fakeStreamResponse() {
  return new Response(
    'data: {"choices":[{"delta":{"content":"OK"}}]}\n\n' +
      'data: [DONE]\n\n',
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnv.baseUrl === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = originalEnv.baseUrl;
  if (originalEnv.apiKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = originalEnv.apiKey;
  if (originalEnv.model === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = originalEnv.model;
});

test('workspace model credentials win over deployment env and stay paired', async () => {
  process.env.LLM_BASE_URL = 'https://env.example/v1';
  process.env.LLM_API_KEY = 'env-key';
  process.env.LLM_MODEL = 'env-model';
  const payload = {
    model: 'qwen-test',
    platformModels: [
      { id: 'qwen-test', baseUrl: 'https://db.example/v1', apiKey: 'db-key', enabled: true },
      { id: 'other-test', baseUrl: 'https://other.example/v1', apiKey: 'other-key', enabled: true },
    ],
    customModels: [],
  };
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return fakeStreamResponse();
  };
  const service = new ExecutionsService(fakePrisma(payload));
  const events = [];
  for await (const event of service.createStream({
    workspaceId: 'ws-test',
    chatId: 'chat-test',
    message: 'hello',
    planSteps: ['connect'],
    actionType: 'knowledge',
  })) events.push(event);

  assert.equal(events.at(-1)?.type, 'done');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://db.example/v1/chat/completions');
  const request = JSON.parse(calls[0].init.body);
  assert.equal(request.model, 'qwen-test');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer db-key');
});

test('chat execution honors the selected model and resolves its own credentials', async () => {
  const payload = {
    model: 'first',
    platformModels: [
      { id: 'first', baseUrl: 'https://first.example/v1', apiKey: 'first-key', enabled: true },
      { id: 'second', baseUrl: 'https://second.example/v1', apiKey: 'second-key', enabled: true },
    ],
  };
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return fakeStreamResponse();
  };
  const service = new ExecutionsService(fakePrisma(payload));
  for await (const _event of service.createStream({
    workspaceId: 'ws-test',
    chatId: 'chat-test',
    message: 'hello',
    model: 'second',
    planSteps: ['connect'],
    actionType: 'knowledge',
  })) {
    // consume the stream
  }
  assert.equal(calls[0].url, 'https://second.example/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer second-key');
});

test('an empty workspace document falls back to a complete env config', async () => {
  process.env.LLM_BASE_URL = 'https://env.example/v1';
  process.env.LLM_API_KEY = 'env-key';
  process.env.LLM_MODEL = 'env-model';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return fakeStreamResponse();
  };
  const service = new ExecutionsService(fakePrisma({ model: 'qwen-test', platformModels: [] }));
  const events = [];
  for await (const event of service.createStream({
    workspaceId: 'ws-test',
    chatId: 'chat-test',
    message: 'hello',
    planSteps: ['connect'],
    actionType: 'knowledge',
  })) events.push(event);

  assert.equal(events.at(-1)?.type, 'done');
  assert.equal(calls[0].url, 'https://env.example/v1/chat/completions');
  assert.equal(JSON.parse(calls[0].init.body).model, 'env-model');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer env-key');
});

test('an explicitly requested unconfigured model does not fall back to deployment env', async () => {
  process.env.LLM_BASE_URL = 'https://env.example/v1';
  process.env.LLM_API_KEY = 'env-key';
  process.env.LLM_MODEL = 'env-model';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return fakeStreamResponse();
  };
  const service = new ExecutionsService(fakePrisma({
    model: 'missing-model',
    platformModels: [
      { id: 'missing-model', baseUrl: 'https://db.example/v1', apiKey: '', enabled: true },
    ],
  }));
  const result = await service.testLlmConnection('ws-test', 'missing-model');

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'llm_not_configured');
  assert.equal(calls.length, 0);
});

test('legacy top-level credentials remain valid when only customModels is present', () => {
  const config = nestLlmConfigFromDoc(
    {
      model: 'glm-5.1',
      baseUrl: 'https://legacy.example/v1',
      apiKey: 'legacy-key',
      customModels: [],
    },
    'glm-5.1',
  );
  assert.equal(config?.baseUrl, 'https://legacy.example/v1');
  assert.equal(config?.apiKey, 'legacy-key');
  assert.equal(config?.model, 'glm-5.1');
});

test('candidate probe is ephemeral and uses the same stream transport', async () => {
  const prisma = fakePrisma({});
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return fakeStreamResponse();
  };
  const service = new ExecutionsService(prisma);
  const result = await service.testLlmConnection('ws-test', undefined, {
    model: 'candidate-model',
    baseUrl: 'https://candidate.example/v1',
    apiKey: 'candidate-key',
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'request');
  assert.equal(calls[0].url, 'https://candidate.example/v1/chat/completions');
  assert.equal(JSON.parse(calls[0].init.body).model, 'candidate-model');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer candidate-key');
  assert.equal(prisma.writes.length, 0);
});

test('probe rejects HTTP errors and empty streams without exposing provider bodies', async () => {
  const service = new ExecutionsService(fakePrisma({}));
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: 'provider-secret-key' }),
    { status: 401, headers: { 'content-type': 'application/json' } },
  );
  const httpResult = await service.testLlmConnection('ws-test', undefined, {
    model: 'candidate-model',
    baseUrl: 'https://candidate.example/v1',
    apiKey: 'candidate-key',
  });
  assert.equal(httpResult.ok, false);
  assert.match(httpResult.message, /HTTP 401/);
  assert.doesNotMatch(httpResult.message, /provider-secret-key/);

  globalThis.fetch = async () => new Response(
    'data: [DONE]\n\n',
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
  const emptyResult = await service.testLlmConnection('ws-test', undefined, {
    model: 'candidate-model',
    baseUrl: 'https://candidate.example/v1',
    apiKey: 'candidate-key',
  });
  assert.equal(emptyResult.ok, false);
  assert.equal(emptyResult.errorCode, 'llm_test_empty_stream');
});

test('requested model cannot inherit another model or a disabled entry', () => {
  const payload = {
    model: 'first',
    apiKey: 'legacy-key',
    baseUrl: 'https://legacy.example/v1',
    platformModels: [
      { id: 'first', baseUrl: 'https://first.example/v1', apiKey: '', enabled: true },
      { id: 'disabled', baseUrl: 'https://disabled.example/v1', apiKey: 'disabled-key', enabled: false },
    ],
  };
  assert.equal(nestLlmConfigFromDoc(payload, 'missing'), null);
  assert.equal(nestLlmConfigFromDoc(payload, 'disabled'), null);
  // A model entry with an empty key must not borrow the legacy key from a
  // different snapshot; otherwise a green test could still fail in chat.
  assert.equal(nestLlmConfigFromDoc(payload, 'first'), null);
  assert.equal(nestLlmConfigFromCandidate({ model: 'x', baseUrl: '', apiKey: 'k' }), null);
});

test('when the active snapshot is absent, the server follows the first enabled model', () => {
  const config = nestLlmConfigFromDoc({
    platformModels: [
      { id: 'off', baseUrl: 'https://off.example/v1', apiKey: 'off-key', enabled: false },
      { id: 'on', baseUrl: 'https://on.example/v1', apiKey: 'on-key', enabled: true },
    ],
  });
  assert.equal(config?.model, 'on');
  assert.equal(config?.apiKey, 'on-key');
});

test('workspace LLM credentials are not readable or writable by guests', async () => {
  const docs = {
    me: async (token) =>
      token === 'member-token'
        ? { ok: true, user: { id: 'u-1', platformRole: 'business_user' } }
        : { ok: false, error: '未登录' },
    listDocs: async () => ({ docs: { 'llm-config': { apiKey: 'secret' }, members: [] } }),
    getDoc: async () => ({ kind: 'llm-config', payload: {} }),
    putDoc: async (_workspaceId, _kind, payload) => ({ kind: 'llm-config', payload }),
  };
  const controller = new PlatformDocsController(docs);
  await assert.rejects(
    controller.getOne('ws-test', 'llm-config'),
    (error) => error?.getStatus?.() === 401,
  );
  await assert.rejects(
    controller.putOne('ws-test', 'llm-config', { payload: {} }),
    (error) => error?.getStatus?.() === 401,
  );
  assert.deepEqual(
    await controller.getOne('ws-test', 'llm-config', 'Bearer member-token'),
    { kind: 'llm-config', payload: {} },
  );
  const listed = await controller.list('ws-test', 'Bearer member-token');
  assert.equal(listed.docs['llm-config'], undefined);
});

test('the server test route requires a workspace session and never persists a candidate', async () => {
  const calls = [];
  const executions = {
    testLlmConnection: async (...args) => {
      calls.push(args);
      return { ok: true, model: 'candidate-model', source: 'request', message: 'ok' };
    },
  };
  const docs = {
    me: async (token) =>
      token === 'member-token'
        ? { ok: true, user: { id: 'u-1', platformRole: 'business_user' } }
        : { ok: false, error: '未登录' },
  };
  const controller = new ExecutionsController(executions, docs);

  await assert.rejects(
    controller.testLlmConfig('ws-test', { model: 'candidate-model' }),
    (error) => error?.getStatus?.() === 401,
  );
  const result = await controller.testLlmConfig(
    'ws-test',
    {
      model: 'candidate-model',
      baseUrl: 'https://candidate.example/v1',
      apiKey: 'candidate-key',
    },
    'Bearer member-token',
  );
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], 'ws-test');
  assert.equal(calls[0][2].apiKey, 'candidate-key');
});
