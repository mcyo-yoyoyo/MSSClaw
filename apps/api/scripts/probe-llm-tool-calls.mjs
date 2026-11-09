#!/usr/bin/env node
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { 'base-url': { type: 'string' }, model: { type: 'string' } } });
const base = (values['base-url'] || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
const model = values.model || process.env.LLM_MODEL;
const key = process.env.LLM_API_KEY;
const rows = [];
const tools = [{ type: 'function', function: { name: 'echo', description: 'Return value', parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } } }];
async function request(messages, stream, force) {
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, tools, stream, tool_choice: force ? { type: 'function', function: { name: 'echo' } } : 'none' }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!stream) return (await response.json()).choices?.[0]?.message;
  const calls = [], decoder = new TextDecoder(); let pending = '', content = '', done = false;
  for await (const chunk of response.body) {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') { done = true; continue; }
      if (!data) continue;
      const choice = JSON.parse(data).choices?.[0];
      if (choice?.finish_reason) done = true;
      const delta = choice?.delta;
      content += delta?.content || '';
      for (const part of delta?.tool_calls || []) {
        const target = calls[part.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } };
        if (part.id) target.id = part.id;
        target.function.name += part.function?.name || '';
        target.function.arguments += part.function?.arguments || '';
      }
    }
  }
  if (!done) throw new Error('stream_truncated');
  return { role: 'assistant', content: content || null, tool_calls: calls.length ? calls : undefined };
}
for (const stream of [false, true]) {
  const prefix = stream ? '流式' : '非流式';
  const messages = [{ role: 'user', content: 'Call echo with value hello. After each tool result call it again if asked; otherwise say OK.' }];
  try {
    if (!base || !model || !key) throw new Error('缺少 LLM_BASE_URL/LLM_API_KEY/LLM_MODEL');
    for (let round = 1; round <= 3; round++) {
      const message = await request(messages, stream, true);
      if (!message?.tool_calls?.length) throw new Error('missing_tool_calls');
      messages.push(message);
      for (const call of message.tool_calls) {
        if (!call.id || call.function.name !== 'echo') throw new Error('invalid_tool_call');
        const args = JSON.parse(call.function.arguments);
        if (typeof args.value !== 'string') throw new Error('invalid_arguments');
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(args) });
      }
      rows.push({ 项目: `${prefix}第 ${round} 轮工具调用及 JSON 参数`, 结果: '通过', 原因: '' });
    }
    const continuation = await request(messages, stream, false);
    if (!continuation?.content?.trim()) throw new Error('empty_tool_continuation');
    rows.push({ 项目: `${prefix}工具结果续写`, 结果: '通过', 原因: '' });
  } catch (error) {
    rows.push({ 项目: `${prefix}工具链路`, 结果: '失败', 原因: error.name === 'TimeoutError' ? '30 秒超时' : error.message.replaceAll(key || 'API_KEY_NOT_SET', '[REDACTED]') });
  }
}
console.table(rows);
process.exitCode = rows.some((row) => row.结果 === '失败') ? 1 : 0;
