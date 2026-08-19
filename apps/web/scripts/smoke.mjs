/**
 * Web smoke test: production build + dist artifact checks.
 * Usage: npm run smoke (from apps/web or repo root)
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

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

async function checkPasswordHashing() {
  const server = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.react.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const originalCrypto = globalThis.crypto;
  try {
    if (!originalCrypto?.getRandomValues) {
      throw new Error('Node Web Crypto random provider is unavailable');
    }
    const { hashPassword } = await server.ssrLoadModule('/src/domain/accountCredentials.ts');
    const randomOnlyCrypto = {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    };
    Object.defineProperty(globalThis, 'crypto', {
      value: randomOnlyCrypto,
      configurable: true,
    });

    const fallbackHash = await hashPassword(
      'ChangeMe123',
      '00112233445566778899aabbccddeeff',
    );
    if (fallbackHash !== 'ae3e14902cc8e6a956b33da449152ab673d0a4e94bd8c463fc29fe2086d9315c') {
      throw new Error('HTTP fallback SHA-256 does not match the server hash');
    }
    const unicodeHash = await hashPassword(
      '密码Aa123',
      'ffeeddccbbaa99887766554433221100',
    );
    if (unicodeHash !== '54ba25e1ce122825e7399127ac074e5c076cd41f75207d8aa8c31f0a779cd589') {
      throw new Error('HTTP fallback SHA-256 does not preserve UTF-8 passwords');
    }

    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
    const nativeHash = await hashPassword(
      'ChangeMe123',
      '00112233445566778899aabbccddeeff',
    );
    if (nativeHash !== fallbackHash) {
      throw new Error('WebCrypto and HTTP fallback password hashes differ');
    }
    console.log('✓ password hashing (WebCrypto + insecure HTTP fallback)');
  } finally {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'crypto');
    }
    await server.close();
  }
}

async function main() {
  console.log('→ npm run build');
  await run('npm', ['run', 'build'], webRoot);
  await checkPasswordHashing();

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
