import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestSkillSearchKeywords } from '../src/domain/skillKeywords.ts';
import {
  recognizeSkillHubTags,
  skillHubGroupsFor,
  skillHubSearchTerms,
  skillHubTagsFromModel,
  SKILL_CAPABILITY_GROUPS,
  SKILL_PURPOSE_GROUPS,
  SKILL_ROLE_GROUPS,
  toggleSkillHubTag,
} from '../src/domain/skillHubTags.ts';

const SAMPLE_INSIGHT =
  '面向AI产品经理、PMO，生成手机国别竞品洞察docx报告，支持竞品参数比对、价格测算';

test('样例1 命中岗位、能力、用途、格式和品类，不猜测原文没有的地域', () => {
  const tags = recognizeSkillHubTags({ descZh: SAMPLE_INSIGHT });
  assert.deepEqual(tags.roles, ['AI产品经理', 'PMO']);
  assert.equal(tags.roleStatus, 'ok');
  assert.deepEqual(skillHubGroupsFor(SKILL_ROLE_GROUPS, tags.roles), ['MKT', '质量运营']);
  assert.ok(tags.capabilities.includes('竞品对比'));
  assert.ok(tags.capabilities.includes('参数比对'));
  assert.ok(tags.capabilities.includes('市场测算'));
  assert.equal(tags.capabilityStatus, 'ok');
  assert.ok(tags.purposes.includes('产品洞察'));
  assert.ok(tags.purposes.includes('国别洞察'));
  assert.ok(tags.purposes.includes('竞品分析'));
  assert.deepEqual(skillHubGroupsFor(SKILL_CAPABILITY_GROUPS, tags.capabilities), [
    '分析研判',
    '测算统计',
  ]);
  assert.ok(skillHubGroupsFor(SKILL_PURPOSE_GROUPS, tags.purposes).includes('市场洞察'));
  assert.ok(skillHubGroupsFor(SKILL_PURPOSE_GROUPS, tags.purposes).includes('竞品研判'));
  assert.deepEqual(tags.formats, ['docx']);
  assert.deepEqual(tags.entities, ['手机']);
  assert.deepEqual(tags.regions, []);
  assert.equal(tags.capabilities.includes('内容生成'), false);
});

test('样例2 识别培训专员、内容生成和交付格式，没有次标签', () => {
  const tags = recognizeSkillHubTags({
    descZh: '面向培训专员，批量生成培训课件文本，输出markdown',
  });
  assert.deepEqual(tags.roles, ['培训专员']);
  assert.deepEqual(skillHubGroupsFor(SKILL_ROLE_GROUPS, tags.roles), ['HR']);
  assert.deepEqual(tags.capabilities, ['内容生成']);
  assert.equal(tags.purposeStatus, 'needs_review');
  assert.deepEqual(tags.purposes, []);
  assert.deepEqual(tags.formats, ['markdown', '文本']);
  assert.deepEqual(tags.entities, []);
  assert.deepEqual(tags.regions, []);
});

test('只提到部门时不猜测岗位', () => {
  const tags = recognizeSkillHubTags({ descZh: '给 MKT 部门同事整理周报材料' });
  assert.deepEqual(tags.roles, []);
  assert.equal(tags.roleStatus, 'needs_role');
  assert.equal(tags.formatStatus, 'unspecified');
});

test('质量运营部不算质量运营岗位', () => {
  const tags = recognizeSkillHubTags({ instructions: '质量运营部内部使用' });
  assert.deepEqual(tags.roles, []);
  assert.equal(tags.roleStatus, 'needs_role');
});

test('安装命令里的英文词不会变成标签', () => {
  const tags = recognizeSkillHubTags({
    nameZh: '小语种翻译',
    instructions: 'winget install echo null python bash version dev Setup',
  });
  assert.deepEqual(skillHubSearchTerms(tags), []);
  assert.equal(tags.roleStatus, 'needs_review');
  assert.equal(tags.formatStatus, 'unspecified');
});

test('地域和品类只在原文出现时输出', () => {
  const named = recognizeSkillHubTags({ descZh: '覆盖东南亚、印度的耳机价格' });
  assert.deepEqual(named.regions, ['东南亚', '印度']);
  assert.deepEqual(named.entities, ['耳机']);
  const indonesia = recognizeSkillHubTags({ descZh: '印度尼西亚渠道资料' });
  assert.deepEqual(indonesia.regions, []);
});

test('语义相近词条可以同时保留', () => {
  const tags = recognizeSkillHubTags({ instructions: '输出竞品对比和竞品分析' });
  assert.ok(tags.capabilities.includes('竞品对比'));
  assert.ok(tags.capabilities.includes('竞品分析'));
  assert.ok(tags.purposes.includes('竞品对比'));
  assert.ok(tags.purposes.includes('竞品分析'));
});

test('人工只能改词表内标签，并留下记录', () => {
  const recognized = recognizeSkillHubTags({ descZh: SAMPLE_INSIGHT });
  const rejected = toggleSkillHubTag(recognized, 'roles', '自定义岗位', '张三');
  assert.deepEqual(rejected.roles, recognized.roles);
  const edited = toggleSkillHubTag(recognized, 'roles', '上市经理', '张三');
  assert.ok(edited.roles.includes('上市经理'));
  assert.equal(edited.source, 'human');
  assert.equal(edited.roleStatus, 'ok');
  assert.match(edited.audits.at(-1)?.summary ?? '', /增加了岗位职能「上市经理」/);
  assert.equal(edited.audits.at(-1)?.by, '张三');
  const cleared = toggleSkillHubTag(edited, 'roles', '上市经理', '张三');
  assert.equal(cleared.roles.includes('上市经理'), false);
  assert.deepEqual(cleared.roles, ['AI产品经理', 'PMO']);
  assert.match(cleared.audits.at(-1)?.summary ?? '', /删除了岗位职能「上市经理」/);
});

test('模型结果只保留置信度达标的受控词条', () => {
  const tags = skillHubTagsFromModel({
    roles: [
      { label: 'AI产品经理', confidence: 0.91 },
      { label: '自定义岗位', confidence: 0.99 },
      { label: 'PMO', confidence: 0.62 },
    ],
    roleStatus: 'ok',
    capabilities: [{ label: '通用', confidence: 0.95 }],
    purposes: [],
    formats: [{ label: 'docx', confidence: 0.88 }, { label: '全品类', confidence: 1 }],
    formatStatus: 'ok',
    entities: [{ label: '手机', confidence: 0.8 }],
    regions: [],
  });
  assert.ok(tags);
  assert.deepEqual(tags?.roles, ['AI产品经理']);
  assert.equal(tags?.roleStatus, 'ok');
  assert.deepEqual(tags?.capabilities, []);
  assert.equal(tags?.capabilityStatus, 'needs_review');
  assert.deepEqual(tags?.formats, ['docx']);
  assert.deepEqual(tags?.entities, ['手机']);
  assert.equal(tags?.audits.at(-1)?.by, '模型识别');
  assert.match(tags?.audits.at(-1)?.summary ?? '', /Skill\.md/);
});

test('模型只识别到部门时标记待人工补标', () => {
  const tags = skillHubTagsFromModel({ roles: [], roleStatus: 'needs_role', formats: [] });
  assert.equal(tags?.roleStatus, 'needs_role');
  assert.equal(tags?.formatStatus, 'unspecified');
});

test('检索词只有细词条，不含聚类名和复核状态', () => {
  const tags = recognizeSkillHubTags({ descZh: SAMPLE_INSIGHT });
  const terms = skillHubSearchTerms(tags);
  assert.ok(terms.includes('AI产品经理'));
  assert.ok(terms.includes('市场测算'));
  assert.equal(terms.includes('分析研判'), false);
  assert.equal(terms.includes('待人工复核'), false);
  assert.equal(terms.includes('MKT'), false);
  assert.deepEqual(
    suggestSkillSearchKeywords({
      descZh: '面向培训专员，批量生成培训课件文本，输出markdown',
      command: '/winget-install',
      existingTags: ['null', 'bash'],
    }),
    ['培训专员', '内容生成', 'markdown', '文本'],
  );
});
