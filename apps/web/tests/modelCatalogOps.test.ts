import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/ops/ModelCatalogOpsPage.tsx', import.meta.url),
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
