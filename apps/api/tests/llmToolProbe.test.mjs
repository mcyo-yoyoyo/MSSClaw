import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

async function runProbe(base) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [new URL('../scripts/probe-llm-tool-calls.mjs', import.meta.url).pathname, '--base-url', base, '--model', 'test'], { env: { ...process.env, LLM_API_KEY: 'probe-test-secret' } });
    let output = ''; child.stdout.on('data', (data) => { output += data; }); child.stderr.on('data', (data) => { output += data; });
    child.on('close', (code) => resolve({ code, output }));
  });
}
test('probe verifies streaming fragments, three rounds, tool replies and redaction', async () => {
  let calls = 0, continuations = 0;
  const server = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls++;
    assert.equal(body.tools[0].function.name, 'echo');
    const finish = body.tool_choice === 'none';
    if (finish) { continuations++; assert.equal(body.messages.filter((m) => m.role === 'tool').length, 3); }
    const message = finish ? { role: 'assistant', content: 'OK' } : { role:'assistant',content:null,tool_calls:[{ id:`call_${calls}`,type:'function',function:{ name:'echo',arguments:'{"value":"hello"}' } }] };
    if (!body.stream) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ choices:[{ message }] })); }
    else {
      res.setHeader('Content-Type','text/event-stream');
      res.write(`data: ${JSON.stringify({ choices:[{ delta: finish ? { content:'OK' } : { tool_calls:[{ index:0,...message.tool_calls[0],function:{ name:'echo',arguments:'{"value":' } }] } }] })}\n\n`);
      if (!finish) res.write(`data: ${JSON.stringify({ choices:[{ delta:{ tool_calls:[{ index:0,function:{ arguments:'"hello"}' } }] } }] })}\n\n`);
      res.end('data: [DONE]\n\n');
    }
  });
  await new Promise((resolve) => server.listen(0,'127.0.0.1',resolve));
  try {
    const result = await runProbe(`http://127.0.0.1:${server.address().port}`);
    assert.equal(result.code,0,result.output); assert.equal(calls,8); assert.equal(continuations,2);
    assert.ok(!result.output.includes('probe-test-secret'));
  } finally { server.close(); }
});
