import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/verify-deployed-oauth-login.mjs', import.meta.url));

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

test('已部署后端验收脚本覆盖真人回调后的平台会话与登出链路', async (t) => {
  const calls = [];
  let loggedOut = false;
  let serverError;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/api/v1/health') {
        calls.push('health');
        json(res, 200, { status: 'ok', auth: { mode: 'oauth', ready: true } });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/auth/oauth/diagnostics') {
        calls.push('diagnostics');
        json(res, 404, { statusCode: 404, message: 'diagnostics_disabled' });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
        calls.push('password');
        json(res, 403, { error: 'password_login_disabled' });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/auth/oauth/authorize-url') {
        calls.push('authorize');
        assert.equal(url.searchParams.get('workspaceId'), 'ws-mss-ai');
        assert.equal(url.searchParams.get('returnTo'), '#/home');
        json(res, 200, {
          ok: true,
          state: 'STATE-123',
          url: 'https://uniportal-beta.huawei.com/saaslogin1/oauth2/authorize?state=STATE-123',
        });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/auth/oauth/callback') {
        calls.push('callback');
        const body = await readJson(req);
        assert.equal(body.code, 'CODE-456');
        assert.equal(body.state, 'STATE-123');
        assert.match(body.visitorId, /^oauth-backend-test-/);
        json(res, 200, {
          ok: true,
          token: 'platform-session-token-123456',
          expiresAt: '2099-01-01T00:00:00.000Z',
          traceId: 'trace-1',
          user: {
            id: 'u-test',
            email: 'tester@huawei.com',
            platformRole: 'business_user',
            workspaceId: 'ws-mss-ai',
          },
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
        calls.push(loggedOut ? 'me-after-logout' : 'me');
        assert.equal(req.headers.authorization, 'Bearer platform-session-token-123456');
        json(
          res,
          200,
          loggedOut
            ? { ok: false, error: '会话已失效，请重新登录' }
            : {
                ok: true,
                user: { id: 'u-test', email: 'tester@huawei.com', workspaceId: 'ws-mss-ai' },
              },
        );
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/auth/oauth/logout-url') {
        calls.push('logout-url');
        json(res, 200, { url: 'https://uniportal-beta.huawei.com/saaslogin1/oauth2/logout' });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
        calls.push('logout');
        assert.deepEqual(await readJson(req), { workspaceId: 'ws-mss-ai' });
        loggedOut = true;
        json(res, 200, { ok: true });
        return;
      }
      json(res, 404, { error: 'not_found', path: url.pathname });
    } catch (error) {
      serverError = error;
      json(res, 500, { error: String(error) });
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const address = server.address();

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [
      script,
      `--api-base=http://127.0.0.1:${address.port}`,
      '--callback-url=https://app.test/oauth/callback?code=CODE-456&state=STATE-123',
    ],
    { timeout: 10_000 },
  );

  assert.equal(stderr, '');
  assert.ifError(serverError);
  assert.match(stdout, /后端 OAuth 登录流程验证通过/);
  assert.match(stdout, /diagnostics 已关闭，跳过预检/);
  assert.ok(!stdout.includes('platform-session-token-123456'));
  assert.deepEqual(calls, [
    'health',
    'diagnostics',
    'password',
    'authorize',
    'callback',
    'me',
    'logout-url',
    'logout',
    'me-after-logout',
  ]);
});
