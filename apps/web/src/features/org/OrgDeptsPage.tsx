import { useEffect, useState } from 'react';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { orgAdminApi, type DictionaryEntry, type OrgTaxonomy } from '@/api/orgAdminApi';
import { cn } from '@/lib/utils';
import { useOrgTaxonomyStore } from '@/stores/orgTaxonomyStore';
import { btn, ErrorBanner, errorText, notify, Pill, ReadOnlyHint, useOrgEditable } from './orgShared';

type Kind = 'regions' | 'domains';

const KIND_META: Record<Kind, { title: string; hint: string; idPlaceholder: string; namePlaceholder: string }> = {
  regions: {
    title: '区域',
    hint: '每个成员属于一个区域',
    idPlaceholder: '编号，如 europe',
    namePlaceholder: '名称，如 欧洲',
  },
  domains: {
    title: '领域',
    hint: '每个成员属于一个领域',
    idPlaceholder: '编号，如 legal',
    namePlaceholder: '名称，如 法务',
  },
};

export function OrgDeptsPage() {
  const editable = useOrgEditable('org-depts');
  const [taxonomy, setTaxonomy] = useState<OrgTaxonomy>({ regions: [], domains: [] });
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    try {
      setTaxonomy(await orgAdminApi.taxonomy());
    } catch (e) {
      setError(errorText(e));
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  /** 改完同步刷新 AI工具Hub 的筛选项 */
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      await reload();
      useOrgTaxonomyStore.getState().hydrate();
      return true;
    } catch (e) {
      notify(errorText(e));
      return false;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="部门"
        subtitle="部门由区域和领域组成，用在成员归属和 AI工具Hub 的筛选；Agent、Skill 打了区域 / 领域标签后，只对对应成员可见，没打标签的所有人可见。"
      />
      {editable ? null : <ReadOnlyHint />}
      <ErrorBanner message={error} />
      <div className="grid gap-4 xl:grid-cols-2">
        {(['regions', 'domains'] as const).map((kind) => (
          <DictionaryCard key={kind} kind={kind} entries={taxonomy[kind]} editable={editable} run={run} />
        ))}
      </div>
    </div>
  );
}

function DictionaryCard({
  kind,
  entries,
  editable,
  run,
}: {
  kind: Kind;
  entries: DictionaryEntry[];
  editable: boolean;
  run: (action: () => Promise<unknown>, done: string) => Promise<boolean>;
}) {
  const meta = KIND_META[kind];
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const add = async () => {
    if (!newId.trim() || !newName.trim()) {
      notify('编号和名称都要填');
      return;
    }
    const ok = await run(() => orgAdminApi.createEntry(kind, { id: newId.trim(), name: newName.trim() }), `已新增${meta.title}「${newName.trim()}」`);
    if (ok) {
      setNewId('');
      setNewName('');
    }
  };

  const rename = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      notify('名称不能为空');
      return;
    }
    const ok = await run(() => orgAdminApi.updateEntry(kind, editing.id, { name: editing.name.trim() }), '名称已更新');
    if (ok) setEditing(null);
  };

  /** 和相邻项互换 sort */
  const move = (index: number, delta: -1 | 1) => {
    const a = entries[index];
    const b = entries[index + delta];
    if (!a || !b) return;
    const [sortA, sortB] = a.sort === b.sort ? [index + delta, index] : [b.sort, a.sort];
    void run(async () => {
      await orgAdminApi.updateEntry(kind, a.id, { sort: sortA });
      await orgAdminApi.updateEntry(kind, b.id, { sort: sortB });
    }, '顺序已调整');
  };

  const remove = (entry: DictionaryEntry) => {
    if (!window.confirm(`删除${meta.title}「${entry.name}」？还有成员属于它时不能删除，可以改为停用。`)) return;
    void run(() => orgAdminApi.deleteEntry(kind, entry.id), `已删除${meta.title}「${entry.name}」`);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="text-[14px] font-semibold text-zinc-900">
          {meta.title}
          <span className="ml-2 text-[12px] font-normal text-zinc-400">{entries.length} 项</span>
        </h3>
        <span className="text-[11px] text-zinc-400">{meta.hint}</span>
      </div>
      <ul className="divide-y divide-zinc-50">
        {entries.map((entry, index) => (
          <li key={entry.id} className={cn('flex items-center gap-3 px-4 py-2', !entry.enabled && 'bg-zinc-50/70')}>
            <span className="w-24 shrink-0 truncate font-mono text-[11px] text-zinc-400">{entry.id}</span>
            {editing?.id === entry.id ? (
              <input
                className="apple-input h-8 min-w-0 flex-1"
                value={editing.name}
                autoFocus
                onChange={(e) => setEditing({ id: entry.id, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void rename();
                  if (e.key === 'Escape') setEditing(null);
                }}
              />
            ) : (
              <span className={cn('min-w-0 flex-1 truncate text-[13px]', entry.enabled ? 'text-zinc-900' : 'text-zinc-400')}>{entry.name}</span>
            )}
            {entry.enabled ? null : <Pill tone="amber">已停用</Pill>}
            {editable ? (
              <span className="flex shrink-0 items-center gap-2.5">
                {editing?.id === entry.id ? (
                  <>
                    <button type="button" className={btn.link} onClick={() => void rename()}>
                      保存
                    </button>
                    <button type="button" className={btn.link} onClick={() => setEditing(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={btn.link} title="上移" disabled={index === 0} onClick={() => move(index, -1)}>
                      <i className="fa-solid fa-arrow-up" />
                    </button>
                    <button type="button" className={btn.link} title="下移" disabled={index === entries.length - 1} onClick={() => move(index, 1)}>
                      <i className="fa-solid fa-arrow-down" />
                    </button>
                    <button type="button" className={btn.link} onClick={() => setEditing({ id: entry.id, name: entry.name })}>
                      改名
                    </button>
                    <button
                      type="button"
                      className={btn.link}
                      onClick={() =>
                        void run(
                          () => orgAdminApi.updateEntry(kind, entry.id, { enabled: !entry.enabled }),
                          entry.enabled ? `已停用「${entry.name}」` : `已启用「${entry.name}」`,
                        )
                      }
                    >
                      {entry.enabled ? '停用' : '启用'}
                    </button>
                    <button type="button" className={btn.danger} onClick={() => remove(entry)}>
                      删除
                    </button>
                  </>
                )}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {editable ? (
        <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3">
          <input className="apple-input h-8 w-36" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder={meta.idPlaceholder} />
          <input
            className="apple-input h-8 min-w-0 flex-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={meta.namePlaceholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
          />
          <button type="button" className={btn.primary} onClick={() => void add()}>
            新增
          </button>
        </div>
      ) : null}
    </section>
  );
}
