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

async function checkInternalOfficeSearch() {
  const server = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.react.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const [{ filterInternalOfficeScenesBySearch }, { intentSearchHintExamples }] =
      await Promise.all([
        server.ssrLoadModule('/src/domain/internalOfficeSceneSearch.ts'),
        server.ssrLoadModule('/src/domain/capabilityIntentSearch.ts'),
      ]);
    const scenes = [
      {
        id: 'capture',
        label: '录音及纪要用云笔记',
        english: 'CAPTURE',
        description: '自动记录会议、转写发言并提炼结论与行动项，让会后跟进立即开始。',
        tools: [{ id: 'cloudnote', name: '云笔记', blurb: '写报告与会议纪要' }],
      },
      {
        id: 'read',
        label: '文档解析用员工助手读一下',
        english: 'READ',
        description: '快速读懂文档与报告，提炼观点、数据、风险和可行动信息。',
        tools: [{ id: 'assistant', name: '员工助手', blurb: '个人日常 Skill' }],
      },
      {
        id: 'write',
        label: '写作及总结用员工助手写一下',
        english: 'WRITE',
        description: '基于已有信息生成日报、周报、月报与工作总结，并持续润色。',
        tools: [{ id: 'assistant', name: '员工助手', blurb: '个人日常 Skill' }],
      },
      {
        id: 'ask',
        label: '问答与任务处理用员工助手',
        english: 'ASK',
        description: '支持日常问答、邮件编写、方案输出和任务执行。',
        tools: [{ id: 'assistant', name: '员工助手', blurb: '综合知识问答' }],
      },
      {
        id: 'search',
        label: '信息查找用W3智能搜索',
        english: 'SEARCH',
        description: '专注信息检索与知识获取，整合企业知识。',
        tools: [{ id: 'w3', name: 'W3智能搜索', blurb: '查制度与内部入口' }],
      },
      {
        id: 'specialist',
        label: '专项问答用小鲁班',
        english: 'SPECIALIST',
        description: '提供自定义办公功能与专项 AI 对话。',
        tools: [{ id: 'xiaoluban', name: '小鲁班', blurb: '专项知识问答' }],
      },
      {
        id: 'knowledge',
        label: '知识库及问答用员工助手',
        english: 'KNOWLEDGE',
        description: '建设组织知识库，让沉淀的内部资料真正被使用。',
        tools: [{ id: 'assistant', name: '员工助手', blurb: '知识库' }],
      },
    ];
    const expectedByQuery = new Map([
      ['周报、方案、工作总结', ['write']],
      ['会后自动成稿', ['capture']],
      ['查制度、找内部资料', ['search', 'knowledge']],
      ['日常提问、总结、润色', ['ask', 'write']],
      ['读懂文档提炼观点', ['read']],
      ['专项业务连续追问', ['specialist']],
    ]);

    const displayedHints = intentSearchHintExamples('internal');
    if (displayedHints.length !== expectedByQuery.size) {
      throw new Error('internal office search hint count changed without regression coverage');
    }
    for (const query of displayedHints) {
      const expectedIds = expectedByQuery.get(query);
      if (!expectedIds) {
        throw new Error(`internal office search hint "${query}" has no regression expectation`);
      }
      const actualIds = new Set(
        filterInternalOfficeScenesBySearch(scenes, query).map((scene) => scene.id),
      );
      for (const expectedId of expectedIds) {
        if (!actualIds.has(expectedId)) {
          throw new Error(`internal office search "${query}" missed ${expectedId}`);
        }
      }
    }

    const customScene = {
      id: 'custom-finance',
      label: '财经流程助手',
      english: 'FINANCE',
      description: '查询结算规则与预算流程。',
      tools: [{ id: 'finance-tool', name: '财经助手', blurb: '预算问答' }],
    };
    const catalogTools = [
      {
        id: 'finance-tool',
        productIntro: '覆盖差旅报销与费用申请制度。',
        coreCapabilities: ['报销政策检索'],
      },
    ];
    const catalogHit = filterInternalOfficeScenesBySearch(
      [customScene],
      '差旅报销',
      catalogTools,
    );
    if (catalogHit[0]?.id !== customScene.id) {
      throw new Error('internal office search ignored catalog tool metadata');
    }
    if (filterInternalOfficeScenesBySearch(scenes, '完全不存在的能力').length !== 0) {
      throw new Error('internal office search returned an unrelated scene');
    }
    if (filterInternalOfficeScenesBySearch(scenes, '').length !== scenes.length) {
      throw new Error('empty internal office search did not preserve all scenes');
    }
    console.log('✓ internal office intent search');
  } finally {
    await server.close();
  }
}

async function main() {
  console.log('→ npm run build');
  await run('npm', ['run', 'build'], webRoot);
  await checkPasswordHashing();
  await checkInternalOfficeSearch();

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
