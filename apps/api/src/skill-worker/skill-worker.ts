import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import type { SkillRun } from '@prisma/client';
import { BlobStoreService } from '../persistence/blob-store.service';
import { SkillRunService } from './skill-run.service';
import { extractPackage, unpackZip, MAX_PACKAGE_BYTES } from './package';
import type { SandboxDriver } from './sandbox-driver';

export async function blobBytes(blobs: BlobStoreService, id: string) {
  const blob = await blobs.get(id);
  const chunks: Buffer[] = []; let size = 0;
  try {
    for await (const chunk of blob.stream) {
      size += chunk.length;
      if (size > MAX_PACKAGE_BYTES) throw new Error('blob_too_large');
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), meta: blob.meta };
  } finally { blob.stream.destroy(); }
}
export class SkillWorker {
  constructor(private readonly runs: SkillRunService, private readonly blobs: BlobStoreService, private readonly driver: SandboxDriver, private readonly workerId: string) {}

  async execute(run: SkillRun, shutdown?: AbortSignal) {
    let root: string | undefined;
    const abort = new AbortController();
    const stop = () => abort.abort();
    shutdown?.addEventListener('abort', stop, { once: true });
    let heartbeatBusy = false;
    const timer = setInterval(() => {
      if (heartbeatBusy) return;
      heartbeatBusy = true;
      void this.runs.heartbeat(run.id, this.workerId).then((current) => { if (current.cancelRequested) stop(); }).catch(stop).finally(() => { heartbeatBusy = false; });
    }, 1000);
    const step = async <T>(name: string, operation: () => Promise<T>) => {
      if (abort.signal.aborted) throw new Error('cancelled');
      await this.runs.event(run.id, 'step_start', { name });
      const result = await operation();
      await this.runs.event(run.id, 'step_end', { name });
      return result;
    };
    try {
      if (shutdown?.aborted || run.cancelRequested) throw new Error('cancelled');
      root = await mkdtemp(join(tmpdir(), 'mss-skill-'));
      await chmod(root, 0o755);
      const mounts = { skill: join(root, 'skill'), input: join(root, 'input'), output: join(root, 'output') };
      for (const path of Object.values(mounts)) await mkdir(path, { mode: 0o755 });
      await chmod(mounts.output, 0o777);
      const manifest = await step('prepare', async () => {
        const reference = run.packageBlob as { id: string };
        const pkg = await blobBytes(this.blobs, reference.id);
        const manifest = await extractPackage(pkg.bytes, mounts.skill);
        const platform = process.env.SKILL_SANDBOX_DRIVER === 'local' ? process.platform : 'linux';
        if (!manifest.platforms.some((p) => p === platform)) throw new Error('platform_not_supported');
        const ids = run.inputBlobIds as string[];
        if (ids.length > manifest.inputs.maxCount) throw new Error('too_many_inputs');
        for (const [index, id] of ids.entries()) {
          const blob = await blobBytes(this.blobs, id);
          const name = basename(blob.meta.name);
          if (!manifest.inputs.extensions.includes(extname(name).toLowerCase())) throw new Error('input_extension_not_allowed');
          await writeFile(join(mounts.input, `${index}-${name}`), blob.bytes, { mode: 0o644 });
        }
        return manifest;
      });
      const local = process.env.SKILL_SANDBOX_DRIVER === 'local';
      const result = await step('execute', () => this.driver.run({
        image: manifest.image || process.env.SKILL_SANDBOX_IMAGE || 'mssclaw-python:1', runId: run.id,
        workdirMounts: mounts, command: [manifest.runtime, local ? join(mounts.skill, manifest.entry) : `/skill/${manifest.entry}`],
        env: { MSSCLAW_INPUT_DIR: local ? mounts.input : '/input', MSSCLAW_OUTPUT_DIR: local ? mounts.output : '/output', LANG: 'C.UTF-8', TZ: 'UTC' },
        timeoutSec: manifest.timeoutSec, memoryMb: manifest.memoryMb, cpus: 1, networkPolicy: 'none', signal: abort.signal,
      }));
      await this.runs.event(run.id, 'log', { stdout: result.stdout, stderr: result.stderr });
      if (result.timedOut) { await this.runs.finish(run.id, 'timeout', 'timeout', undefined, this.workerId); return; }
      if (abort.signal.aborted) throw new Error('cancelled');
      if (result.exitCode !== 0) throw new Error(`script_exit_${result.exitCode}`);
      const artifacts = await step('artifacts', async () => {
        const names = await readdir(mounts.output);
        if (names.length > 100) throw new Error('too_many_artifacts');
        let totalBytes = 0;
        const results: { id: string; name: string; mimeType: string; size: number }[] = [];
        for (const expected of manifest.outputs) {
          const regex = new RegExp('^' + expected.pattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
          const matches = names.filter((name) => regex.test(name));
          if (!matches.length) throw new Error(`artifact_missing:${expected.pattern}`);
          for (const name of matches) {
            if (results.some((a) => a.name === name)) continue;
            const path = join(mounts.output, name), stat = await lstat(path);
            if (!stat.isFile() || stat.nlink !== 1 || stat.size < 1 || stat.size > 20 * 1024 * 1024) throw new Error('invalid_artifact');
            totalBytes += stat.size;
            if (totalBytes > MAX_PACKAGE_BYTES) throw new Error('artifacts_too_large');
            const bytes = await readFile(path);
            const extensions: Record<string, string[]> = { 'text/markdown': ['.md'], 'text/plain': ['.txt'], 'application/json': ['.json'], 'image/png': ['.png'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] };
            if (!extensions[expected.mime].includes(extname(name))) throw new Error('artifact_mime_mismatch');
            if (expected.mime === 'image/png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('artifact_mime_mismatch');
            if (name.endsWith('.xlsx')) {
              const workbook = unpackZip(bytes);
              if (!workbook.has('[Content_Types].xml') || !workbook.has('xl/workbook.xml')) throw new Error('artifact_mime_mismatch');
            }
            if (expected.mime.startsWith('text/')) {
              new TextDecoder('utf-8', { fatal: true }).decode(bytes);
              if (bytes.includes(0)) throw new Error('artifact_mime_mismatch');
            }
            if (expected.mime === 'application/json') JSON.parse(bytes.toString('utf8'));
            const blob = await this.blobs.putBase64({ name, mimeType: expected.mime, dataBase64: bytes.toString('base64'), privateOwner: run.memberId });
            results.push({ id: blob.id, name, mimeType: blob.mimeType, size: blob.size });
            await this.runs.event(run.id, 'artifact', { name, id: blob.id });
          }
        }
        return results;
      });
      await this.runs.finish(run.id, 'succeeded', undefined, artifacts, this.workerId);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'worker_failed';
      await this.runs.event(run.id, 'error', { message });
      await this.runs.finish(run.id, abort.signal.aborted ? 'cancelled' : 'failed', message, undefined, this.workerId);
    } finally {
      clearInterval(timer); shutdown?.removeEventListener('abort', stop);
      if (root) await rm(root, { recursive: true, force: true });
    }
  }
}
