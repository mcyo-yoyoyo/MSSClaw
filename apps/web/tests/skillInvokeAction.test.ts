import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

const configSkillSource = readFileSync(
  new URL('../src/features/skill/SkillCenterPage.tsx', import.meta.url),
  'utf8',
);
const skillHubSource = readFileSync(
  new URL('../src/features/market/MarketShelfPage.tsx', import.meta.url),
  'utf8',
);
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

type SkillRuntimeModule = {
  isSkillCallable: (skill: { published: boolean; callable?: boolean }) => boolean;
};

let vite: ViteDevServer;
let skillRuntime: SkillRuntimeModule;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  skillRuntime = (await vite.ssrLoadModule('/src/domain/skillRuntime.ts')) as SkillRuntimeModule;
});

after(async () => {
  await vite.close();
});

test('上架可调用状态只在已发布且勾选 callable 时生效', () => {
  assert.equal(skillRuntime.isSkillCallable({ published: true, callable: true }), true);
  assert.equal(skillRuntime.isSkillCallable({ published: true, callable: false }), false);
  assert.equal(skillRuntime.isSkillCallable({ published: false, callable: true }), false);
});

test('配置 Skill 卡片只在上架可调用时展示调用按钮', () => {
  const footerStart = configSkillSource.indexOf('footerActions={');
  assert.notEqual(footerStart, -1, '配置 Skill 卡片应有操作区');
  const footer = configSkillSource.slice(footerStart);
  assert.match(footer, /\{isSkillCallable\(s\) \? \(/, '调用按钮必须由 isSkillCallable 控制');
  assert.match(footer, /handleInvoke\(s\)/, '调用按钮必须复用 handleInvoke');
  assert.match(footer, />\s*调用\s*<\/button>/, '配置 Skill 卡片应展示调用按钮');
});

test('Skill Hub 仅在当前方案开放执行且 Skill 可调用时展示调用按钮', () => {
  assert.match(
    skillHubSource,
    /const renderSkillInvokeAction = \(skill: PrototypeSkillSeed \| undefined\) => \{[\s\S]*?if \(!skill \|\| !canRunSkills \|\| !isSkillCallable\(skill\)\) return null;/,
    'MVP 下 Skill Hub 调用按钮必须隐藏，并继续检查 Skill 可调用状态',
  );
  assert.match(
    skillHubSource,
    /onClick=\{\(event\) => \{[\s\S]*?invokeSkillExperience\(skill\)/,
    'Skill Hub 调用按钮必须复用统一 Skill 调用入口',
  );
  assert.equal(
    skillHubSource.match(/inlineAction=\{renderSkillInvokeAction\(skill\)\}/g)?.length,
    2,
    '精选和更多 Skill 卡片都必须在详情左侧复用同一套调用门禁',
  );
});

test('Skill 调用只打开当前页面对话抽屉，不创建任务或跳转', () => {
  const start = appSource.indexOf('const performInvokeSkill');
  const end = appSource.indexOf('// 登录浮层', start);
  const handler = appSource.slice(start, end);
  assert.match(handler, /setSkillChatDrawer\(\{ skill: currentSkill, open: true \}\)/);
  assert.doesNotMatch(handler, /createAgentTaskSession|goToTaskWithTransit/);
});
