import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// This separate loopback gateway serves built files, never the Vite source tree.
// Existing local development services and their access rules are left unchanged.
const root = await realpath(fileURLToPath(new URL('../apps/web/dist/', import.meta.url)));
const { pilotAssetVisible } = createRequire(import.meta.url)('../apps/api/dist/ai-knowledge/ai-knowledge.resources.js');
const port = Number(process.env.MSS_PUBLIC_PORT || 5180);
const api = 'http://127.0.0.1:3000';
const publicDocs = new Set([
  'nav-presentation', 'workspace-config', 'ai-news', 'ai-brief-email-copy',
  'station-announcements', 'plaza-howto', 'mss-build-stats', 'business-scenario-catalog',
  'external-taxonomy', 'external-tool-layout', 'internal-office-scenes', 'home-featured',
  'org-taxonomy', 'market-featured', 'skill-reviews', 'demo-content',
]);
const publicReads = new Set([
  '/health', '/auth/config', '/auth/me', '/marketplace', '/tools', '/portal-content',
  '/market-engagement', '/ai-daily-news', '/case-insights', '/catalog',
]);
const publicPosts = new Set([
  '/auth/login', '/auth/logout', '/auth/oauth/callback', '/market-engagement/events',
  '/portal-analytics/views', '/portal-analytics/gate-events',
]);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
};

function json(res, status, value, head = false) {
  const data = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
  res.end(head ? undefined : data);
}
function authHeaders(req) {
  return Object.fromEntries(['authorization', 'x-session-token'].flatMap(key => typeof req.headers[key] === 'string' ? [[key, req.headers[key]]] : []));
}
async function member(req) {
  const headers = authHeaders(req);
  if (!Object.keys(headers).length) return null;
  const response = await fetch(`${api}/api/v1/auth/me`, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  const session = await response.json();
  return session.ok && session.user?.id ? session.user : null;
}
function forward(req, res, url) {
  const headers = { ...req.headers, host: 'localhost:3000' };
  for (const key of ['connection', 'proxy-authorization', 'proxy-connection', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']) delete headers[key];
  // Backend trusts only loopback proxies; do not relay arbitrary forwarded headers.
  headers['x-forwarded-for'] = req.socket.remoteAddress || '127.0.0.1';
  const upstream = http.request(`${api}${url.pathname}${url.search}`, { method: req.method, headers }, response => {
    const responseHeaders = { ...response.headers };
    for (const key of ['connection', 'keep-alive', 'transfer-encoding']) delete responseHeaders[key];
    res.writeHead(response.statusCode || 502, responseHeaders);
    response.on('error', () => res.destroy());
    response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) json(res, 502, { message: '本机 API 暂时不可用。' }); else res.destroy(); });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
}
async function filteredCatalog(req, res, url, user) {
  const response = await fetch(`${api}${url.pathname}${url.search}`, { headers: authHeaders(req), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (response.ok && data && !user) {
    for (const key of ['tools', 'agents', 'skills', 'automations', 'kbDocs']) {
      if (Array.isArray(data[key])) data[key] = data[key].filter(item => pilotAssetVisible(item));
    }
    if (Array.isArray(data.items)) data.items = data.items.filter(item => item.published !== false);
    if (url.pathname === '/api/v1/catalog') { data.resources = []; data.chats = {}; }
  }
  json(res, response.status, data, req.method === 'HEAD');
}
async function handleApi(req, res, url) {
  const route = url.pathname.slice('/api/v1'.length).replace(/\/$/, '') || '/';
  const read = req.method === 'GET' || req.method === 'HEAD';
  const user = await member(req);
  // Actor/ownership validation for MAX remains in its existing backend controller.
  const max = route.startsWith('/ai-knowledge/');
  const publicDoc = read && /^\/docs\/[^/]+$/.test(route) && publicDocs.has(route.slice(6));
  const publicBlob = read && /^\/(?:workspaces\/[^/]+\/)?blobs\/[0-9a-f]{32}$/.test(route);
  const publicEngagement = req.method === 'POST' && /^\/market-engagement\/[^/]+\/actions$/.test(route);
  const publicMembers = read && route === '/docs/members';
  const allowed = max || publicDoc || publicBlob || publicEngagement || publicMembers || (read && publicReads.has(route)) || (req.method === 'POST' && publicPosts.has(route));
  if (!user && !allowed) return json(res, 401, { message: '此操作需要登录。' });
  if (route.startsWith('/inbox/') && url.searchParams.has('userId') && user && url.searchParams.get('userId') !== String(user.id)) return json(res, 403, { message: '只能访问自己的消息。' });
  if (read && ['/marketplace', '/tools', '/portal-content', '/catalog'].includes(route)) return filteredCatalog(req, res, url, user);
  if (read && route === '/docs/members' && !user) {
    // Guests do not need the staff directory; the existing guest UI tolerates an empty list.
    return json(res, 200, { kind: 'members', payload: { members: [] } }, req.method === 'HEAD');
  }
  forward(req, res, url);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (/%(?:2f|5c|00)/i.test(url.pathname)) return json(res, 400, { message: 'Invalid path' });
    if (url.pathname.startsWith('/api/v1/')) return await handleApi(req, res, url);
    if (!['GET', 'HEAD'].includes(req.method || '')) return json(res, 405, { message: 'Method not allowed' });
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.split('/').some(part => part.startsWith('.')) || pathname.includes('\\') || pathname.endsWith('.map')) return json(res, 404, { message: 'Not found' });
    const requested = path.resolve(root, '.' + pathname);
    if (requested !== root && !requested.startsWith(root + path.sep)) return json(res, 404, { message: 'Not found' });
    let filename = requested;
    try { if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html'); }
    catch { if (path.extname(filename)) return json(res, 404, { message: 'Not found' }); filename = path.join(root, 'index.html'); }
    filename = await realpath(filename);
    if (!filename.startsWith(root + path.sep)) return json(res, 404, { message: 'Not found' });
    const info = await stat(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(filename).on('error', () => res.destroy()).pipe(res);
  } catch {
    if (!res.headersSent) json(res, 502, { message: '临时分享入口暂不可用，请稍后重试。' });
    else res.destroy();
  }
});
server.requestTimeout = 600000;
server.on('error', error => { console.error(`Public gateway failed: ${error.code || 'unknown'}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Public share gateway listening on http://127.0.0.1:${port}`));
