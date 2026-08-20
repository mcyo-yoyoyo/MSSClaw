import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_HUB_SEARCH_HINTS,
  matchesAgentHubSearch,
} from '../src/domain/agentHubSearch.ts';

test('exposes the three Agent Hub quick searches in product order', () => {
  assert.deepEqual(AGENT_HUB_SEARCH_HINTS, ['洞察', 'VOC', '内容生成']);
});

test('matches keywords against Agent title, description, and tags', () => {
  assert.equal(
    matchesAgentHubSearch({ title: '问卷洞察 Agent', description: '' }, '洞察'),
    true,
  );
  assert.equal(
    matchesAgentHubSearch(
      { title: '培训 Agent', description: '面向门店的培训内容生成' },
      '内容生成',
    ),
    true,
  );
  assert.equal(
    matchesAgentHubSearch(
      {
        title: '企业知识 Agent',
        description: '面向员工提供统一问答入口',
        tags: ['AI 搜索能力', '知识检索'],
      },
      'AI 搜索能力',
    ),
    true,
  );
});

test('allows every Agent Hub quick search to match Agent tags', () => {
  assert.equal(
    matchesAgentHubSearch(
      { title: '市场 Agent', description: '', tags: ['信息洞察'] },
      '洞察',
    ),
    true,
  );
  assert.equal(
    matchesAgentHubSearch(
      { title: '内容 Agent', description: '', tags: ['内容生成'] },
      '内容生成',
    ),
    true,
  );
  assert.equal(
    matchesAgentHubSearch(
      { title: '体验 Agent', description: '', tags: ['客户之声'] },
      'VOC',
    ),
    true,
  );
});

test('normalizes Agent tags with NFKC and case folding', () => {
  assert.equal(
    matchesAgentHubSearch(
      { title: '搜索 Agent', description: '', tags: ['ＡＩＳＥＡＲＣＨ'] },
      'AiSearch',
    ),
    true,
  );
});

test('expands VOC to customer-feedback wording in title or description', () => {
  assert.equal(
    matchesAgentHubSearch(
      { title: '问卷 Agent', description: '负责用户问卷调研与开放题分析' },
      'ＶＯＣ',
    ),
    true,
  );
  assert.equal(
    matchesAgentHubSearch(
      { title: '评论分析 Agent', description: '分析订单评论并输出行动建议' },
      'voc',
    ),
    true,
  );
});

test('does not treat generic non-customer feedback as VOC', () => {
  assert.equal(
    matchesAgentHubSearch(
      {
        title: '零售陪练 Agent',
        description: '门店卖点演练与考核反馈',
        tags: ['训练反馈'],
      },
      'VOC',
    ),
    false,
  );
});

test('supports multiple user keywords with OR semantics', () => {
  assert.equal(
    matchesAgentHubSearch(
      { title: '数据分析 Agent', description: '输出业务洞察报表' },
      '价格 洞察',
    ),
    true,
  );
});

test('does not match unrelated title, description, or tags', () => {
  assert.equal(
    matchesAgentHubSearch(
      { title: '营销 Agent', description: '负责业务报告', tags: ['营销', '周报'] },
      'VOC',
    ),
    false,
  );
});
