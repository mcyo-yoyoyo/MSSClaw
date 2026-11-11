import { useEffect, useRef, useState } from 'react';
import type { SkillRun, SkillRunEvent } from '@/domain/skillRun';
import { cancelSkillRun, createSkillRun, downloadSkillArtifact, getSkillRun, getSkillRunEvents, uploadSkillInput } from '@/api/skillRuns';

const statusLabels: Record<string, string> = { queued: '排队中', running: '执行中', succeeded: '已完成', failed: '失败', cancelled: '已取消', timeout: '超时' };
const statusTone: Record<string, string> = {
  queued: 'bg-zinc-100 text-zinc-600',
  running: 'bg-blue-50 text-blue-600',
  succeeded: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-red-50 text-red-600',
  cancelled: 'bg-zinc-100 text-zinc-500',
  timeout: 'bg-amber-50 text-amber-600',
};
const stepLabels: Record<string, string> = { prepare: '准备文件', execute: '运行脚本', artifacts: '校验和保存产物' };

function errorText(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

/** 把 step_start / step_end 合成一行，日志、产物、错误单独成行 */
function eventRows(events: SkillRunEvent[]) {
  const rows: { key: string; icon: string; text: string; log?: string }[] = [];
  const steps = new Map<string, number>();
  for (const event of events) {
    const name = String(event.payload.name ?? '');
    if (event.type === 'step_start') {
      steps.set(name, rows.length);
      rows.push({ key: `s-${name}`, icon: 'fa-circle-notch fa-spin text-blue-500', text: stepLabels[name] ?? name });
    } else if (event.type === 'step_end') {
      const index = steps.get(name);
      if (index !== undefined) rows[index] = { ...rows[index]!, icon: 'fa-circle-check text-emerald-500' };
    } else if (event.type === 'artifact') {
      rows.push({ key: `a-${event.seq}`, icon: 'fa-file-arrow-down text-zinc-400', text: `生成产物：${String(event.payload.name)}` });
    } else if (event.type === 'error') {
      rows.push({ key: `e-${event.seq}`, icon: 'fa-circle-xmark text-red-500', text: String(event.payload.message) });
    } else if (event.type === 'log') {
      const log = `${String(event.payload.stdout || '')}${String(event.payload.stderr || '')}`.trim();
      if (log) rows.push({ key: `l-${event.seq}`, icon: 'fa-terminal text-zinc-400', text: '脚本输出', log });
    }
  }
  return rows;
}

export function ScriptRunPanel({ skillId, onFallback }: { skillId: string; onFallback: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [run, setRun] = useState<SkillRun | null>(null);
  const [events, setEvents] = useState<SkillRunEvent[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = Boolean(run && ['queued', 'running'].includes(run.status));
  useEffect(() => {
    if (!run || !active) return;
    let disposed = false, timer: ReturnType<typeof setTimeout>;
    let after = 0;
    const poll = async () => {
      try {
        // 先读状态再读事件：任务在两次请求之间结束时，终态之前的事件也一定能拿到
        const current = await getSkillRun(run.id);
        const next = await getSkillRunEvents(run.id, after);
        if (disposed) return;
        if (next.length) { after = next.at(-1)!.seq; setEvents((old) => [...old.filter((e) => e.seq < next[0]!.seq), ...next]); }
        setRun(current);
        if (['queued', 'running'].includes(current.status) || next.length === 200) timer = setTimeout(() => void poll(), 1000);
      } catch (cause) { if (!disposed) { setError(errorText(cause)); timer = setTimeout(() => void poll(), 3000); } }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [run?.id, active]);
  const start = async () => {
    setBusy(true); setError(''); setEvents([]); setRun(null);
    try {
      const ids = [];
      for (const file of files) ids.push(await uploadSkillInput(file));
      const result = await createSkillRun(skillId, ids);
      if (result.fallback) { setError(result.message); onFallback(); } else setRun(result.run);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const rows = eventRows(events);
  const locked = active || busy;
  return (
    <footer className="shrink-0 space-y-3 border-t border-zinc-200/90 bg-white p-3 text-[12px]" aria-label="脚本运行">
      {run ? (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-700">执行进度</span>
            <span role="status" className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone[run.status] ?? statusTone.queued}`}>
              {statusLabels[run.status] ?? run.status}
            </span>
          </div>
          {rows.length ? (
            <ol className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.key} className="text-zinc-600">
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${row.icon} w-3.5 text-center text-[11px]`} />
                    <span>{row.text}</span>
                  </div>
                  {row.log ? (
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-900 px-2.5 py-2 font-mono text-[11px] text-zinc-100">{row.log}</pre>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-zinc-400">等待 Worker 领取任务…</p>
          )}
          {run.status === 'succeeded' && run.artifacts.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {run.artifacts.map((artifact) => (
                <button
                  type="button"
                  key={artifact.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  onClick={() => void downloadSkillArtifact(run.id, artifact.id, artifact.name).catch((cause) => setError(errorText(cause)))}
                >
                  <i className="fa-solid fa-download text-[10px] text-zinc-400" />
                  {artifact.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error || run?.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error || run?.error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          id={`script-run-input-${skillId}`}
          disabled={locked}
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <label
          htmlFor={`script-run-input-${skillId}`}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2.5 text-zinc-500 ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-zinc-400 hover:bg-zinc-50'}`}
        >
          <i className="fa-solid fa-paperclip text-zinc-400" />
          <span className="truncate">{files.length ? files.map((file) => file.name).join('、') : '选择输入文件'}</span>
        </label>
        {active && run ? (
          <button
            type="button"
            className="shrink-0 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-zinc-600 hover:bg-zinc-50"
            onClick={() => void cancelSkillRun(run.id).catch((cause) => setError(errorText(cause)))}
          >
            取消运行
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 rounded-xl bg-zinc-900 px-3.5 py-2.5 font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={locked}
            onClick={() => void start()}
          >
            {busy ? '正在上传…' : run ? '再次运行' : '运行'}
          </button>
        )}
      </div>
    </footer>
  );
}
