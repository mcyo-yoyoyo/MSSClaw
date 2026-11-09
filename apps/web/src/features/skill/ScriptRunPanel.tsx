import { useEffect, useState } from 'react';
import type { SkillRun, SkillRunEvent } from '@/domain/skillRun';
import { cancelSkillRun, createSkillRun, downloadSkillArtifact, getSkillRun, getSkillRunEvents, uploadSkillInput } from '@/api/skillRuns';

const statusLabels: Record<string, string> = { queued: '排队中', running: '执行中', succeeded: '已完成', failed: '失败', cancelled: '已取消', timeout: '超时' };
const stepLabels: Record<string, string> = { prepare: '准备文件', execute: '运行脚本', artifacts: '校验和保存产物' };
export function ScriptRunPanel({ skillId, onFallback }: { skillId: string; onFallback: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [run, setRun] = useState<SkillRun | null>(null);
  const [events, setEvents] = useState<SkillRunEvent[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = run && ['queued', 'running'].includes(run.status);
  useEffect(() => {
    if (!run || !active) return;
    let disposed = false, timer: ReturnType<typeof setTimeout>;
    let after = 0;
    const poll = async () => {
      try {
        const next = await getSkillRunEvents(run.id, after);
        const current = await getSkillRun(run.id);
        if (disposed) return;
        if (next.length) { after = next.at(-1)!.seq; setEvents((old) => [...old.filter((e) => e.seq < next[0]!.seq), ...next]); }
        setRun(current);
        if (['queued', 'running'].includes(current.status) || next.length === 200) timer = setTimeout(() => void poll(), 1000);
      } catch (cause) { if (!disposed) { setError(String(cause)); timer = setTimeout(() => void poll(), 3000); } }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [run?.id, active]);
  const start = async () => {
    setBusy(true); setError(''); setEvents([]);
    try {
      const ids = [];
      for (const file of files) ids.push(await uploadSkillInput(file));
      const result = await createSkillRun(skillId, ids);
      if (result.fallback) { setError(result.message); onFallback(); } else setRun(result.run);
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 p-3 text-sm" aria-label="脚本运行">
    <label className="block">输入文件<input type="file" multiple disabled={Boolean(active) || busy} onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>
    <button type="button" disabled={Boolean(active) || busy} onClick={() => void start()}>{busy ? '正在上传…' : '运行脚本'}</button>
    {active ? <button type="button" onClick={() => void cancelSkillRun(run.id).catch((cause) => setError(String(cause)))}>取消运行</button> : null}
    <p role="status">{run ? statusLabels[run.status] : ''}</p>
    {error || run?.error ? <p role="alert">{error || run?.error}</p> : null}
    <ol>{events.map((event) => <li key={event.seq}>{event.type === 'status' ? statusLabels[String(event.payload.status)] : event.type === 'step_start' || event.type === 'step_end' ? `${stepLabels[String(event.payload.name)]}：${event.type === 'step_start' ? '开始' : '完成'}` : event.type === 'artifact' ? `生成产物：${event.payload.name}` : event.type === 'error' ? String(event.payload.message) : <pre className="whitespace-pre-wrap">{String(event.payload.stdout || '')}{String(event.payload.stderr || '')}</pre>}</li>)}</ol>
    {run?.status === 'succeeded' ? run.artifacts.map((artifact) => <button className="block underline" key={artifact.id} onClick={() => void downloadSkillArtifact(run.id, artifact.id, artifact.name).catch((cause) => setError(String(cause)))}>下载 {artifact.name}</button>) : null}
  </section>;
}
