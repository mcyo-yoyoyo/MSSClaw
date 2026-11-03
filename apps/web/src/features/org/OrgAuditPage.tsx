import { useEffect, useState } from 'react';
import { orgAdminApi, type OperationLogEntry } from '@/api/orgAdminApi';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { cn } from '@/lib/utils';
import { ErrorBanner, Pill, btn, errorText } from './orgShared';

const MODULES = [
  { id: 'all', label: '全部' },
  { id: 'skill', label: 'Skill' },
  { id: 'agent', label: 'Agent' },
  { id: 'tool', label: '工具' },
  { id: 'office-scene', label: '办公场景' },
] as const;

const MODULE_LABEL: Record<OperationLogEntry['module'], string> = {
  skill: 'Skill',
  agent: 'Agent',
  tool: '工具',
  'office-scene': '办公场景',
};

const ACTION_LABEL: Record<OperationLogEntry['action'], string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const PAGE_SIZE = 20;

export function OrgAuditPage() {
  const [module, setModule] = useState<(typeof MODULES)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reload = async (nextModule = module, nextQuery = appliedQuery, nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await orgAdminApi.listOperationLogs(nextModule, nextQuery, nextPage, PAGE_SIZE);
      setLogs(result.logs);
      setTotal(result.total);
      setPage(result.page);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload(module, appliedQuery, page);
    // 筛选或页码变化时重拉；reload 读的就是这次的参数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, appliedQuery, page]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="操作日志"
        subtitle="记录 Skill、Agent、工具和办公场景的新增、修改、删除：谁、什么时间、操作了哪一条。"
      />
      <ErrorBanner message={error} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {MODULES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setPage(1);
              setModule(item.id);
            }}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[12px] font-medium',
              module === item.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            )}
          >
            {item.label}
          </button>
        ))}
        <form
          className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜操作人或记录名称"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-800 outline-none focus:border-zinc-400"
          />
          <button type="submit" className={btn.secondary}>
            搜索
          </button>
        </form>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">时间</th>
              <th className="px-3 py-2 font-medium">操作人</th>
              <th className="px-3 py-2 font-medium">类型</th>
              <th className="px-3 py-2 font-medium">操作</th>
              <th className="px-3 py-2 font-medium">记录</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{formatTime(log.at)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-800">{log.userName}</div>
                  {log.userEmail ? <div className="text-[11px] text-zinc-400">{log.userEmail}</div> : null}
                </td>
                <td className="px-3 py-2 text-zinc-700">{MODULE_LABEL[log.module]}</td>
                <td className="px-3 py-2">
                  <Pill tone={log.action === 'delete' ? 'rose' : log.action === 'create' ? 'green' : 'blue'}>
                    {ACTION_LABEL[log.action]}
                  </Pill>
                </td>
                <td className="px-3 py-2 text-zinc-800">{log.targetName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-zinc-400">还没有操作记录。</p>
        ) : null}
        {loading && logs.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-zinc-400">正在加载…</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-zinc-500">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btn.secondary}
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            上一页
          </button>
          <span>
            第 {page} / {pageCount} 页
          </span>
          <button
            type="button"
            className={btn.secondary}
            disabled={page >= pageCount || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
