import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
export type Usage = { inputTokens: number | null; outputTokens: number | null };
export type AiContext = { ownerKey?: string; userId?: string; sessionId?: string; operationId?: string; purpose?: string };
export const aiContext = new AsyncLocalStorage<AiContext>();
const calls = new AsyncLocalStorage<{ usage?: Usage }>();
let sink: ((event: Record<string, unknown>) => Promise<void>) | undefined;
export function setAiUsageSink(fn: typeof sink) { sink = fn; }
export function captureModelUsage(raw: unknown) {
 if (!raw || typeof raw !== 'object') return;
 const r = raw as Record<string, unknown>;
 const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
 const usage = { inputTokens: count(r.prompt_tokens ?? r.input_tokens ?? r.inputTokens), outputTokens: count(r.completion_tokens ?? r.output_tokens ?? r.outputTokens) };
 if (usage.inputTokens !== null || usage.outputTokens !== null) { const c = calls.getStore(); if(c) c.usage = {inputTokens:usage.inputTokens ?? c.usage?.inputTokens ?? null,outputTokens:usage.outputTokens ?? c.usage?.outputTokens ?? null}; }
}
export async function trackedModelCall<T>(model: string, fn: () => Promise<T>): Promise<T> {
 return calls.run({}, async () => { const started = Date.now(); let status = 'failed';
 try { const result = await fn(); status = 'completed'; return result; }
 finally { const usage = calls.getStore()?.usage;
 if(sink) await sink({ id: randomUUID(), at: new Date().toISOString(), model, ...aiContext.getStore(), status,
 elapsedMs: Date.now()-started, inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null }).catch(() => console.error('AI usage persistence failed')); }
 });
}

export async function persistStreamUsage(model:string, usage:Usage|undefined,status:string,started:number){
 if(sink) await sink({id:randomUUID(),at:new Date().toISOString(),model,...aiContext.getStore(),status,elapsedMs:Date.now()-started,inputTokens:usage?.inputTokens??null,outputTokens:usage?.outputTokens??null}).catch(()=>console.error('AI usage persistence failed'));
}
