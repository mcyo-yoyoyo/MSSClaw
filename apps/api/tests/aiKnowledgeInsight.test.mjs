import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { insightRange, rankInsightSources, insightQuery, attachInsightSnippets } = require('../dist/ai-knowledge/ai-knowledge-insight.resources.js');
const { insightEvidenceIssue, insightReply, materializeInsightEvidence, insightFailureDetail } = require('../dist/ai-knowledge/ai-knowledge-insight.domain.js');
const { AiKnowledgePilotService } = require('../dist/ai-knowledge/ai-knowledge-pilot.service.js');
const { aiContext } = require('../dist/common/ai-usage-context.js');
const usage = { operation: (_actor, _id, _purpose, fn) => aiContext.run({}, fn) };
const now = new Date('2026-10-30T04:00:00Z');
const source = (id, date, changes = {}) => ({ id, kind: 'news', label: '营销内容生成变化' + id,
  description: '这条资料记录了营销团队使用AI生成内容初稿，人工核对后发布。',
  publishedAt: date, dateLabel: '原文发布日期', contentLevel: 'summary', evidence: '摘要', ...changes });
test('近期窗口使用北京时间，支持明确天数、本月和本周', () => {
  assert.equal(insightRange('近7天营销变化', now).from, '2026-10-23T16:00:00.000Z');
  assert.equal(insightRange('本月营销变化', now).from, '2026-09-30T16:00:00.000Z');
  assert.equal(insightRange('本周营销变化', now).from, '2026-10-25T16:00:00.000Z');
});
test('近期检索不混入旧资料、未来资料或日期未知资料', () => {
  const result = rankInsightSources([
    source('new', '2026-10-28T00:00:00Z'), source('old', '2026-08-01T00:00:00Z'),
    source('future', '2026-11-05T00:00:00Z'), source('unknown', null),
  ], '近期营销', insightRange('近期营销', now));
  assert.deepEqual(result.map(s => s.id), ['new']);
});
test('相同来源的跟踪链接和相同标题去重', () => {
  const result = rankInsightSources([
    source('a', '2026-10-28T00:00:00Z', { url: 'https://example.com/one?utm_source=a' }),
    source('b', '2026-10-28T00:00:00Z', { url: 'https://example.com/one?utm_source=b' }),
    source('c', '2026-10-28T00:00:00Z', { label: '营销内容生成变化a' }),
  ], '营销', insightRange('营销', now));
  assert.equal(result.length, 1);
});
test('切换服务领域时不继承视频主题；明确承接上文才组合检索', () => {
  assert.equal(insightQuery('你帮我看看服务领域，有没有最新的ai落地结果', '视频模型能否用于营销'), '你帮我看看服务领域，有没有最新的ai落地结果');
  assert.match(insightQuery('上面这个案例对我有什么用', 'Zapia消费者服务案例'), /Zapia/);
});
const doc = source('real', '2026-10-28T00:00:00Z');
const answer = { intro: '资料体现了内容生产的变化。', findings: [{ title: '初稿辅助', fact: '营销团队采用初稿辅助。',
  evidence: [{ sourceId: 'real', quote: '营销团队使用AI生成内容初稿' }] }], implication: '可以先选一个低风险任务试点。', caveat: '尚无业务效果验证。', nextStep: '' };
test('每条发现必须有真实引用及可回溯的原文片段', () => {
  assert.equal(insightEvidenceIssue(answer, [doc]), null);
  const wrongId = structuredClone(answer); wrongId.findings[0].evidence[0].sourceId = 'invented';
  assert.match(insightEvidenceIssue(wrongId, [doc]), /不存在/);
  const wrongQuote = structuredClone(answer); wrongQuote.findings[0].evidence[0].quote = '已经节省了百分之九十的人力';
  assert.match(insightEvidenceIssue(wrongQuote, [doc]), /连续原文/);
  const blankQuote = structuredClone(answer); blankQuote.findings[0].evidence[0].quote = '        ';
  assert.match(insightEvidenceIssue(blankQuote, [doc]), /连续原文/);
  const text = insightReply(answer, [doc], '仅摘要');
  assert.match(text, /\[1\]/); assert.match(text, /对你的工作有什么启发/); assert.match(text, /仅摘要/);
});
test('来源和片段短编号由后端还原真实ID和原文，非法片段不能通过', () => {
  const candidates = attachInsightSnippets([doc]);
  const numbered = structuredClone(answer);
  numbered.findings[0].evidence = [{ sourceId: 'r1', snippetId: 's1' }];
  assert.equal(insightEvidenceIssue(numbered, candidates), null);
  const resolved = materializeInsightEvidence(numbered, candidates);
  assert.equal(resolved.findings[0].evidence[0].sourceId, doc.id);
  assert.equal(resolved.findings[0].evidence[0].quote, doc.description);
  numbered.findings[0].evidence[0].snippetId = 's999';
  assert.match(insightEvidenceIssue(numbered, candidates), /不存在.*片段/);
});
test('格式超长与引用错误分别诊断，不把长度问题误报为来源失败', () => {
  const long = structuredClone(answer); long.nextStep = '字'.repeat(251);
  assert.equal(insightFailureDetail(long, [doc]).code, 'insight_format');
  assert.match(insightFailureDetail(long, [doc]).fields.join(','), /nextStep/);
  const wrong = structuredClone(answer); wrong.findings[0].evidence[0].sourceId = 'fake';
  assert.equal(insightFailureDetail(wrong, [doc]).code, 'insight_reference');
});
test('修复请求携带具体错误和上一轮结果，成功后保存后端还原的证据', async () => {
  let saved; const prompts = [];
  const db = { appSetting: { create: async ({ data }) => { saved = data.value; } } };
  const insights = { search: async () => ({ sources: [doc], range: insightRange('近期营销', now),
    coverage: { reportsWithBody: 0, truncated: false, localUnavailable: false } }) };
  const service = new AiKnowledgePilotService(db, {}, insights, usage);
  const wrong = structuredClone(answer); wrong.nextStep = '字'.repeat(251);
  const corrected = structuredClone(answer); corrected.findings[0].evidence = [{ sourceId: 'r1', snippetId: 's1' }];
  service.complete = async input => { prompts.push(input); return { value: prompts.length === 1 ? wrong : corrected, model: 'test' }; };
  await service.message({ key: 'guest:test', type: 'guest' }, '近期营销变化', undefined, 'insight');
  const repair = JSON.parse(prompts[1].at(-1).content);
  assert.match(repair.problem.fields.join(','), /nextStep/);
  assert.deepEqual(repair.previousAnswer, wrong);
  assert.equal(saved.messages.at(-1).insight.answer.findings[0].evidence[0].quote, doc.description);
});
test('没有匹配资料时不调用模型冒充洞察，仍保存可追溯的资料边界', async () => {
  let saved;
  const db = { appSetting: { create: async ({ data }) => { saved = data.value; } } };
  const insights = { search: async () => ({ sources: [], range: insightRange('最近营销', now),
    coverage: { reportsWithBody: 0, truncated: false, localUnavailable: false } }) };
  const service = new AiKnowledgePilotService(db, {}, insights, usage);
  service.complete = async () => { throw Error('must not call model'); };
  const session = await service.message({ key: 'guest:test', type: 'guest' }, '最近营销有什么变化', undefined, 'insight');
  assert.equal(session.mode, 'insight'); assert.equal(session.messages.at(-1).insight.noEvidence, true);
  assert.equal(session.messages.at(-1).sources.length, 0); assert.match(saved.messages.at(-1).text, /没有.*找到/);
});
