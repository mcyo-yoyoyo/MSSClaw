import { spawn } from 'child_process';

export interface SandboxOptions {
  image: string;
  runId: string;
  workdirMounts: { skill: string; input: string; output: string };
  command: string[];
  env: Record<string, string>;
  timeoutSec: number;
  memoryMb: number;
  cpus: number;
  networkPolicy: 'none';
  signal: AbortSignal;
}
export interface SandboxResult { exitCode: number; stdout: string; stderr: string; timedOut: boolean }
export interface SandboxDriver { run(options: SandboxOptions): Promise<SandboxResult>; cleanup?(runId: string): Promise<void> }
const ENV_KEYS = new Set(['MSSCLAW_INPUT_DIR', 'MSSCLAW_OUTPUT_DIR', 'LANG', 'TZ']);
function safeEnv(env: Record<string, string>) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => ENV_KEYS.has(key)));
}
export function dockerArgs(o: SandboxOptions, name: string): string[] {
  return ['run', '--rm', '--pull=never', '--name', name, '--network', 'none', '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
    '--user', '10001:10001', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '128',
    '--memory', `${o.memoryMb}m`, '--cpus', String(o.cpus), '--workdir', '/skill',
    ...Object.entries(o.workdirMounts).flatMap(([key, path]) => ['--mount', `type=bind,src=${path},dst=/${key}${key === 'output' ? '' : ',readonly'}`]),
    ...Object.entries(safeEnv(o.env)).flatMap(([key, value]) => ['--env', `${key}=${value}`]), o.image, ...o.command];
}
function cliCommand(cli: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cli, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => { if (stderr.length < 2048) stderr += chunk.toString(); });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('sandbox_cleanup_timeout')); }, 10000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => { clearTimeout(timer); code === 0 || (args[0] === 'rm' && /no such container|no container with (?:name|ID)/i.test(stderr)) ? resolve() : reject(new Error('sandbox_cleanup_failed')); });
  });
}
async function execute(cli: string, args: string[], o: SandboxOptions, dockerName?: string): Promise<SandboxResult> {
  if (o.signal.aborted) throw new Error('cancelled');
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { cwd: o.workdirMounts.skill, env: dockerName ? process.env : { PATH: process.env.PATH, ...safeEnv(o.env) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', remaining = 65536, timedOut = false;
    let stopping: Promise<void> | undefined;
    const stop = () => {
      stopping ??= (async () => {
        if (dockerName) {
          await cliCommand(cli, ['kill', dockerName]).catch(() => undefined);
          await cliCommand(cli, ['rm', '-f', dockerName]);
        }
        child.kill('SIGKILL');
      })();
      void stopping.catch(reject);
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, o.timeoutSec * 1000);
    o.signal.addEventListener('abort', stop, { once: true });
    const collect = (chunk: Buffer, error: boolean) => {
      const value = chunk.subarray(0, remaining); remaining -= value.length;
      if (error) stderr += value.toString(); else stdout += value.toString();
    };
    child.stdout.on('data', (chunk: Buffer) => collect(chunk, false));
    child.stderr.on('data', (chunk: Buffer) => collect(chunk, true));
    const clear = () => { clearTimeout(timer); o.signal.removeEventListener('abort', stop); };
    child.once('error', (error) => { clear(); reject(error); });
    child.once('close', async (code) => {
      clear();
      try { await stopping; resolve({ exitCode: code ?? -1, stdout, stderr, timedOut }); } catch (error) { reject(error); }
    });
  });
}
export class DockerSandboxDriver implements SandboxDriver {
  async cleanup(runId: string) {
    const cli = process.env.SKILL_SANDBOX_CLI || 'docker';
    await cliCommand(cli, ['rm', '-f', `mss-skill-${runId}`]);
  }
  async run(o: SandboxOptions) {
    const cli = process.env.SKILL_SANDBOX_CLI || 'docker';
    const name = `mss-skill-${o.runId}`;
    try { return await execute(cli, dockerArgs(o, name), o, name); }
    finally { await this.cleanup(o.runId); }
  }
}
export class LocalSandboxDriver implements SandboxDriver {
  async run(o: SandboxOptions) {
    if (process.env.NODE_ENV === 'production' || process.env.SKILL_SANDBOX_DRIVER !== 'local') throw new Error('local_driver_forbidden');
    return execute(o.command[0], o.command.slice(1), o);
  }
}
export function createSandboxDriver(): SandboxDriver {
  const driver = process.env.SKILL_SANDBOX_DRIVER || 'docker';
  if (driver === 'local' && process.env.NODE_ENV !== 'production') return new LocalSandboxDriver();
  if (driver === 'docker') return new DockerSandboxDriver();
  throw new Error('invalid_or_unsafe_sandbox_driver');
}
