import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterPageHeader, StatCardGrid } from '@/components/center/CenterShell';
import { fetchExecutionHistory } from '@/api/centerApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type ExecRow = Awaited<ReturnType<typeof fetchExecutionHistory>>[number];

const STATUS_STYLE: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  running: 'bg-sky-50 text-sky-700 ring-sky-200',
  error: 'bg-rose-50 text-rose-700 ring-rose-200',
  aborted: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function formatTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function ExecutionHistoryPage() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const [rows, setRows] = useState<ExecRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!apiConnected) {
      setRows([]);
      setError('共享 API 未连接，无法读取执行历史。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchExecutionHistory(workspaceId, 100);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on workspace / api flip
  }, [workspaceId, apiConnected]);

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="执行历史"
        subtitle="Nest 执行流落库记录 · 按工作空间查询"
        tip="需已配置 LLM_* 或工作区 llm-config；无模型时记录为失败（禁止脚本假完成）。"
        actions={
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? '刷新中…' : '刷新'}
          </button>
        }
      />

      <StatCardGrid
        items={[
          ['记录数', rows.length],
          ['成功', doneCount],
          ['失败', errCount],
          ['API', apiConnected ? '已连接' : '离线'],
        ]}
      />

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">时间</th>
              <th className="px-3 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 font-medium">会话</th>
              <th className="px-3 py-2 font-medium">任务摘要</th>
              <th className="px-3 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  暂无执行记录。在任务区发起一次运行后会出现在此。
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                  {formatTime(row.startedAt)}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-800">
                  {row.agentName || '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.chatId}</td>
                <td className="max-w-[28rem] truncate px-3 py-2.5 text-slate-700" title={row.message}>
                  {row.message || '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-xs ring-1 ring-inset',
                      STATUS_STYLE[row.status] ?? STATUS_STYLE.aborted,
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
