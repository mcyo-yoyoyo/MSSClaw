import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultExternalTaxonomyCatalog,
  externalToolTypeEntryIsSelected,
  externalToolTypeSelectionLabels,
  listVisibleExternalToolTypes,
  resolveExternalToolTypeSelection,
  toggleExternalToolTypeSelection,
} from '../src/domain/externalTaxonomyCatalog.ts';

test('用户页分类选项与外部工具精选的十个可见分类一致', () => {
  const catalog = defaultExternalTaxonomyCatalog();
  assert.deepEqual(
    listVisibleExternalToolTypes(catalog).map((type) => type.label),
    [
      '通用AI助手',
      'AI搜索与研究',
      '知识管理与写作',
      '演示与文档',
      '图像与设计',
      '视频与数字人',
      '音频与语音',
      '会议与协作',
      '编程开发',
      '智能体',
    ],
  );
});

test('多分类优先并兼容旧单分类字段', () => {
  assert.deepEqual(
    resolveExternalToolTypeSelection({
      toolTypeId: 'general',
      toolTypeIds: [' search ', '', 'search', ' knowledge '],
    }),
    ['search', 'knowledge'],
  );
  assert.deepEqual(resolveExternalToolTypeSelection({ toolTypeId: 'general' }), ['general']);
});

test('聚合分类可回显并移除隐藏底层类型', () => {
  const catalog = defaultExternalTaxonomyCatalog();
  const knowledge = catalog.types.find((type) => type.id === 'knowledge')!;
  assert.equal(externalToolTypeEntryIsSelected(['writing'], knowledge), true);
  assert.deepEqual(externalToolTypeSelectionLabels(['writing'], catalog), ['知识管理与写作']);
  assert.deepEqual(toggleExternalToolTypeSelection(['writing'], knowledge, catalog), []);
  assert.deepEqual(toggleExternalToolTypeSelection([], knowledge, catalog), ['knowledge']);
});

test('切换可见分类时保留未知旧分类并按当前字典生成文案', () => {
  const catalog = defaultExternalTaxonomyCatalog();
  catalog.types = catalog.types.map((type) =>
    type.id === 'general' ? { ...type, label: '通用助手（运营命名）' } : type,
  );
  const general = catalog.types.find((type) => type.id === 'general')!;
  const selected = toggleExternalToolTypeSelection(['legacy-type'], general, catalog);
  assert.deepEqual(selected, ['general', 'legacy-type']);
  assert.deepEqual(externalToolTypeSelectionLabels(selected, catalog), [
    '通用助手（运营命名）',
    'legacy-type',
  ]);
});
