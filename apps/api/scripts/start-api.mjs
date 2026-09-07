import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scripts = {
  local: { name: 'start:dev', proxy: '0' },
  test: { name: 'start:prod', proxy: '1' },
  production: { name: 'start:prod', proxy: '1' },
};

const environment = process.argv[2];
const config = Object.hasOwn(scripts, environment) ? scripts[environment] : undefined;
if (!config) {
  console.error('用法：node apps/api/scripts/start-api.mjs <local|test|production>');
  process.exit(2);
}

const env = {
  ...process.env,
  AIHOT_PROXY_ENABLED: config.proxy,
  // 模型请求必须直连内网；AIHOT 的代理由 Nest 内部按上面的开关按请求启用。
  NODE_USE_ENV_PROXY: '',
};

const nodeOptions = env.NODE_OPTIONS?.replace(/(^|\s)--use-env-proxy(?=\s|$)/g, ' ').trim();
if (nodeOptions) env.NODE_OPTIONS = nodeOptions;
else delete env.NODE_OPTIONS;

const isWindows = process.platform === 'win32';
const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/d', '/s', '/c', `npm.cmd run ${config.name}`]
  : ['run', config.name];
const apiDir = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(command, args, {
  cwd: apiDir,
  env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', (error) => {
  console.error(`启动 API 失败：${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
