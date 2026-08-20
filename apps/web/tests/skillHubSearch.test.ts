import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchesSkillHubSearch,
  SKILL_BODY_SUMMARY_LIMIT,
  SKILL_HUB_SEARCH_HINTS,
} from '../src/domain/skillHubSearch.ts';

test('exposes the four Skill Hub quick searches in product order', () => {
  assert.deepEqual(SKILL_HUB_SEARCH_HINTS, [
    '信息洞察',
    '隐私合规',
    '工作总结',
    'VOC',
  ]);
});

test('searches title, description, and the Skill body summary', () => {
  assert.equal(
    matchesSkillHubSearch(
      { title: '零售信息洞察', description: '', instructions: '' },
      '信息洞察',
    ),
    true,
  );
  assert.equal(
    matchesSkillHubSearch(
      { title: '文档检查', description: '营销物料合规筛查', instructions: '' },
      '隐私合规',
    ),
    true,
  );
  assert.equal(
    matchesSkillHubSearch(
      { title: '文档工具', description: '', instructions: '你是个人工作总结 Skill。' },
      '工作总结',
    ),
    true,
  );
});

test('matches VOC case-insensitively through body-summary keywords', () => {
  assert.equal(
    matchesSkillHubSearch(
      { title: '订单评论分析', description: '', instructions: '输出可进例会的 VoC 行动建议。' },
      'ＶＯＣ',
    ),
    true,
  );
});

test('does not treat a generic compliance reminder in the body as privacy compliance', () => {
  assert.equal(
    matchesSkillHubSearch(
      {
        title: '商务邮件草稿',
        description: '生成邮件内容',
        instructions: '正式使用前请完成合规复核。',
      },
      '隐私合规',
    ),
    false,
  );
});

test('does not search beyond the 800-character body summary', () => {
  const prefix = 'x'.repeat(SKILL_BODY_SUMMARY_LIMIT);
  assert.equal(
    matchesSkillHubSearch(
      { title: '无关标题', description: '无关描述', instructions: `${prefix}VOC` },
      'VOC',
    ),
    false,
  );
});
