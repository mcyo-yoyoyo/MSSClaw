/**
 * Web smoke test: production build + dist artifact checks.
 * Usage: npm run smoke (from apps/web or repo root)
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('→ npm run build');
  await run('npm', ['run', 'build'], webRoot);

  const distDir = path.join(webRoot, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  if (!existsSync(distIndex)) {
    throw new Error('dist/index.html missing after build');
  }

  const html = readFileSync(distIndex, 'utf8');
  const assetDir = path.join(distDir, 'assets');
  const hasJsBundle = existsSync(assetDir) && readFileSync(distIndex, 'utf8').includes('/assets/');

  const checks = [
    ['dist/index.html', true],
    ['react root mount point', html.includes('id="root"')],
    ['bundled JS reference', hasJsBundle],
  ];

  for (const [label, ok] of checks) {
    if (!ok) throw new Error(`Smoke check failed: ${label}`);
    console.log(`✓ ${label}`);
  }

  console.log('\nSmoke passed (build + dist artifacts).');
}

main().catch((err) => {
  console.error('\nSmoke failed:', err.message);
  process.exit(1);
});
