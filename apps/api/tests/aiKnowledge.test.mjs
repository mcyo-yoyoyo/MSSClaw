import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRuleSolution,
  canConfirmDemand,
  clarifyDraft,
  createDraft,
  inferScenario,
  sanitizeLlmSolution,
  updateDraftDemand,
} from '../dist/ai-knowledge/ai-knowledge.domain.js';

test('单独出现渠道不会把营销需求误判为 Sell Out 预测', () => {
  assert.equal(inferScenario('检索渠道竞品的 AI 营销案例'), 'mkt-campaign');
});

test('a draft must collect required inputs before it can be confirmed', () => {
  const draft = createDraft('如何提高国家渠道 Sell Out 预测效率？');
  assert.equal(draft.scenarioId, 'gtm-sellout');
  assert.equal(canConfirmDemand(draft.demand), false);

  const clarified = clarifyDraft(
    draft,
    '已有 PSI、历史销量和市场信号，最终由国家业务负责人确认。',
  );
  assert.equal(canConfirmDemand(clarified.demand), true);
  assert.match(clarified.demand.inputs, /PSI/);
  assert.match(clarified.demand.humanCheckpoint, /负责人/);
});

test('manual demand edits are canonicalized on the server', () => {
  const draft = createDraft('希望把一项业务问题整理成可以执行的行动方案');
  const updated = updateDraftDemand(draft, {
    currentMethod: '  Excel 手工整理  ',
    inputs: '业务台账',
  });
  assert.equal(updated.demand.currentMethod, 'Excel 手工整理');
  assert.equal(updated.demand.inputs, '业务台账');
  assert.equal(updated.demand.pendingKeys.includes('currentMethod'), false);
});

test('demand fields containing unresolved placeholders cannot be confirmed', () => {
  const draft = createDraft('把产品录屏剪成宣传视频并完成配音和动效');
  const updated = updateDraftDemand(draft, {
    currentMethod: '希望完全通过 AI 工具完成',
    inputs: '已有产品录屏，具体素材数量和时长待确认',
  });
  assert.equal(updated.demand.pendingKeys.includes('inputs'), true);
  assert.equal(canConfirmDemand(updated.demand), false);
});

test('rule generation keeps evidence and produces all three diagnosis layers', () => {
  const clarified = clarifyDraft(
    createDraft('如何分析多国家、多语种的电商评论？'),
    '覆盖拉美电商平台，已经有可导出的评论数据。',
  );
  const resources = [
    { id: 'agent-voc', kind: 'agent', label: '评论分析 Agent' },
    { id: 'case-voc', kind: 'case', label: '多语种案例', url: 'https://example.com/case' },
  ];
  const solution = buildRuleSolution(clarified, resources);
  assert.equal(solution.generationSource, 'rule');
  assert.match(solution.diagnosis.need, /评论|行动/);
  assert.equal(solution.toolRecommendations[0].resource.id, 'agent-voc');
  assert.equal(solution.caseInsights[0].resource.id, 'case-voc');
  assert.deepEqual(solution.evidence, resources);
});

test('invalid LLM structures cannot replace the validated rule solution', () => {
  const clarified = clarifyDraft(
    createDraft('如何整合营销活动材料并形成行动建议？'),
    '已有活动 Brief 和物料文件，由活动负责人确认。',
  );
  const base = buildRuleSolution(clarified, []);
  assert.equal(sanitizeLlmSolution({ diagnosis: {} }, base, [], 'test'), null);
});

test('LLM diagnosis can only bind real tool and case resources', () => {
  const clarified = clarifyDraft(
    createDraft('如何分析多国家、多语种的电商评论？'),
    '覆盖拉美电商平台，已经有可导出的评论数据。',
  );
  const resources = [
    { id: 'skill-translate', kind: 'skill', label: '评论语种翻译' },
    { id: 'case-reversia', kind: 'case', label: 'Reversia 多语种案例' },
  ];
  const base = buildRuleSolution(clarified, resources);
  const generated = sanitizeLlmSolution({
    title: '多语种评论诊断方案',
    diagnosis: {
      need: '统一处理拉美多语种评论',
      currentSituation: '评论分散且依赖人工翻译',
      keyProblems: ['语种不统一', '人工归纳耗时'],
      solutionDirection: '先翻译标准化，再进行统一分析',
    },
    tools: [{
      resourceId: 'skill-translate',
      problemSolved: '多语种评论无法统一分析',
      introduction: '平台已上线的评论翻译 Skill',
      howToUse: ['输入原始评论', '输出原文与译文'],
      output: '标准化评论数据',
      expectedEffect: '减少逐条人工翻译',
    }],
    cases: [{
      resourceId: 'case-reversia',
      similarProblem: '需要处理多语言电商内容',
      approach: '使用 AI 完成跨语种转换',
      result: '案例未披露量化结果',
      lessons: ['保留原文与译文对应关系'],
      applicability: '当前需求还需要叠加评论分析',
    }],
  }, base, resources, 'test-model');
  assert.equal(generated.toolRecommendations[0].resource.id, 'skill-translate');
  assert.equal(generated.caseInsights[0].resource.id, 'case-reversia');
});

test('LLM output cannot drop a strongly matched tool and pass with only a case', () => {
  const clarified = updateDraftDemand(
    createDraft('把产品录屏剪成宣传视频并完成配音和动效'),
    {
      problem: '将产品录屏剪成宣传视频，并增加配音、动效和说明文字',
      goal: '产出一分钟产品宣传成片',
      currentMethod: '目前由人工剪辑，希望改用 AI 完成',
      inputs: '三段产品录屏，总时长十分钟，已有中文解说稿',
      aiRole: '完成剪辑、配音、动效和字幕编排',
      humanCheckpoint: '产品负责人确认最终成片',
    },
  );
  const resources = [
    {
      id: 'tool-video',
      kind: 'tool',
      label: '视频创作工具',
      relevanceScore: 96,
      matchReasons: ['核心能力', '适用场景'],
    },
    { id: 'case-launch', kind: 'case', label: '产品上市案例', relevanceScore: 50 },
  ];
  const base = buildRuleSolution(clarified, resources);
  const generated = sanitizeLlmSolution({
    title: '产品录屏宣传视频方案',
    diagnosis: {
      need: '把现有录屏加工为宣传成片',
      currentSituation: '已有录屏和解说稿',
      keyProblems: ['素材需要重新编排'],
      solutionDirection: '使用视频工具完成剪辑和包装',
    },
    tools: [],
    cases: [{
      resourceId: 'case-launch',
      similarProblem: '需要快速准备产品上市内容',
      approach: '使用 AI 生成上市物料',
      toolsUsed: ['案例原文未明确说明'],
      result: '案例未披露量化结果',
      lessons: ['先形成统一素材底稿'],
      applicability: '只可参考内容组织方式',
    }],
  }, base, resources, 'test-model');
  assert.equal(generated, null);
});
