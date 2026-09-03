import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyClarification,
  buildSolution,
  canConfirmDemand,
  inferScenario,
  startDemandDraft,
} from '../src/domain/aiKnowledge.ts';

test('识别三类首批业务问题', () => {
  assert.equal(inferScenario('根据 PSI 预测渠道 Sell Out'), 'gtm-sellout');
  assert.equal(inferScenario('分析多语种电商评论和VOC'), 'ecommerce-voc');
  assert.equal(inferScenario('整合营销活动物料'), 'mkt-campaign');
  assert.equal(inferScenario('检索渠道竞品的 AI 营销案例'), 'mkt-campaign');
});

test('补充信息后可以确认需求并生成行动方案', () => {
  const draft = startDemandDraft('我每周用Excel和PSI预测渠道Sell Out');
  assert.equal(canConfirmDemand(draft.demand), false);

  const clarified = applyClarification(
    draft,
    '有PSI、历史销量和市场信号，最终由国家业务负责人确认',
  );
  assert.equal(canConfirmDemand(clarified.demand), true);

  const solution = buildSolution(clarified);
  assert.equal(solution.domain, 'GTM');
  assert.equal(solution.actions.length, 4);
  assert.match(solution.diagnosis!.need, /预测|风险/);
  assert.ok(solution.toolRecommendations!.length > 0);
  assert.ok(solution.caseInsights!.length > 0);
});
