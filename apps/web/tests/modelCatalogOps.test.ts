import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/ops/ModelCatalogOpsPage.tsx', import.meta.url),
  'utf8',
);
const llmClientSource = readFileSync(
  new URL('../src/api/llmClient.ts', import.meta.url),
  'utf8',
);
const configStoreSource = readFileSync(
  new URL('../src/stores/llmConfigStore.ts', import.meta.url),
  'utf8',
);
const llmConfigSource = readFileSync(
  new URL('../src/domain/llmConfig.ts', import.meta.url),
  'utf8',
);
const settingsModalSource = readFileSync(
  new URL('../src/components/home/LlmSettingsModal.tsx', import.meta.url),
  'utf8',
);

test('模型配置页用添加模型按钮打开弹窗，不再渲染页内添加表单', () => {
  assert.match(source, /data-testid="model-add-button"[\s\S]*?onClick=\{openAddModel\}/);
  assert.match(source, /<CenterModal[\s\S]*?open=\{addOpen\}[\s\S]*?title="添加平台模型"/);
  assert.match(source, /data-testid="model-add-modal"/);
  assert.doesNotMatch(source, /<h3[^>]*>添加平台模型<\/h3>/);
});

test('新增模型默认展示 OpenAI Bearer 约定并支持调试失败反馈', () => {
  assert.match(source, /默认连接协议：OpenAI 兼容格式/);
  assert.match(source, /认证方式：Bearer token/);
  assert.match(source, /Authorization: Bearer <your-api-key>/);
  assert.match(source, /data-testid="model-add-test-button"[\s\S]*?handleTestDraft/);
  assert.match(source, /data-testid="model-add-test-result"[\s\S]*?role=\{draftTestResult\.ok \? 'status' : 'alert'\}/);
  assert.match(source, /调试失败：\$\{draftTestResult\.message\}/);
  assert.match(source, /upsertPlatformModel\([\s\S]*?baseUrl: draft\.baseUrl\.trim\(\)[\s\S]*?apiKey: draft\.apiKey\.trim\(\)/);
});

test('模型测试走服务端同一工作区链路，不再从浏览器直连厂商', () => {
  assert.match(llmClientSource, /\/api\/v1\/workspaces\/\$\{encodeURIComponent\(workspaceId\)\}\/llm-config\/test/);
  assert.match(llmClientSource, /testWorkspaceLlmConnection/);
  assert.match(source, /import \{ testWorkspaceLlmConnection/);
  assert.doesNotMatch(source, /testLlmConnection\(/);
});

test('模型测试显式锁定当前工作区，避免切租户时串用配置', () => {
  assert.match(source, /testWorkspaceLlmConnection\(\{\s*workspaceId,\s*model: modelId/);
  assert.match(source, /testWorkspaceLlmConnection\(\{\s*workspaceId:\s*testWorkspaceId,\s*model:\s*model\.id/);
  assert.match(settingsModalSource, /testWorkspaceLlmConnection\(\{\s*workspaceId,\s*model:/);
  assert.match(source, /if \(!isAuthenticated\) return;/);
});

test('聊天请求带上当前选用模型，由服务端按目录精确解析', () => {
  const runtimeSource = readFileSync(
    new URL('../src/api/agentRuntime.ts', import.meta.url),
    'utf8',
  );
  assert.match(runtimeSource, /hasWorkspaceLlmCredential\(activeLlmConfig\)/);
  assert.match(runtimeSource, /model:\s*hasWorkspaceLlmCredential\(activeLlmConfig\)/);
});

test('切换组织默认模型同步聊天执行使用的 active model 快照', () => {
  const setter = configStoreSource.slice(configStoreSource.indexOf('setDefaultModelId: async'));
  assert.match(setter, /defaultModelId: id/);
  assert.match(setter, /syncSnapshotFromSelection\(/);
  assert.match(setter, /modelId\)/);
});

test('模型目录存在时不把当前快照 Key 复制给其他模型', () => {
  assert.match(configStoreSource, /hasModelDirectory/);
  assert.match(configStoreSource, /legacySharedKey && !hasModelDirectory/);
  assert.match(configStoreSource, /hasModelDirectory \? '' : legacySharedKey/);
  assert.match(configStoreSource, /m\.id === legacyModelId/);
  assert.match(configStoreSource, /Preserve an old single-model payload/);
});

test('显式模型目录只使用当前条目凭证，旧无目录配置仍回退顶层凭证', () => {
  assert.match(llmConfigSource, /const hasModelDirectory/);
  assert.match(llmConfigSource, /if \(hasModelDirectory\)/);
  assert.match(llmConfigSource, /!listed \|\| \('enabled' in listed && listed\.enabled === false\)/);
  assert.match(llmConfigSource, /baseUrl: listed\.baseUrl\?\.trim\(\) \|\| ''/);
  assert.match(llmConfigSource, /apiKey: listed\.apiKey\?\.trim\(\) \|\| ''/);
  assert.match(llmConfigSource, /const apiKey = \(meta\.apiKey \|\| config\.apiKey \|\| ''\)/);
  assert.match(llmConfigSource, /const list = Array\.isArray\(config\.platformModels\)/);
});

test('已有任意工作区 Key 时，状态与聊天都不会伪装成部署环境回退', () => {
  assert.match(configStoreSource, /nestLlmEnvConfigured && !hasWorkspaceLlmCredential\(config\)/);
  assert.match(llmConfigSource, /export function hasWorkspaceLlmCredential/);
});

test('已有模型测试结果在当前页保留诊断并标明使用的保存配置', () => {
  assert.match(source, /const \[lastModelTest, setLastModelTest\]/);
  assert.match(source, /data-testid="model-test-diagnostic"/);
  assert.match(source, /role=\{lastModelTest\.result\.ok \? 'status' : 'alert'\}/);
  assert.match(source, /result,\s*testedAt: Date\.now\(\)/);
  assert.match(source, /本次使用数据库中已保存的 Base URL 和 API Key/);
  assert.match(source, /hadUnsavedKey/);
  assert.match(source, /result\.diagnostics\.httpStatus/);
  assert.match(source, /useWorkspaceStore\.getState\(\)\.workspaceId === testWorkspaceId/);
});

test('客户端保留服务端错误码和脱敏诊断字段', () => {
  assert.match(llmClientSource, /errorCode\?: string/);
  assert.match(llmClientSource, /diagnostics\?: LlmTestDiagnostics/);
  assert.match(llmClientSource, /function normalizeLlmTestDiagnostics/);
  assert.match(llmClientSource, /normalizeLlmTestDiagnostics\(body\.diagnostics\)/);
  assert.match(llmClientSource, /Bearer \[redacted\]/);
});
