import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { inboxKindLabel } from '@/domain/inbox';
import { getCurrentUserId } from '@/domain/currentUser';
import { ensureAiNewsOverviewInbox } from '@/domain/aiNews';
import { ensureStationAnnouncementInbox } from '@/domain/stationAnnouncements';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

export function MyMessagesPage() {
  const userId = getCurrentUserId();
  const messages = useInboxStore((s) => s.messages);
  const markRead = useInboxStore((s) => s.markRead);
  const markAllRead = useInboxStore((s) => s.markAllRead);
  const remove = useInboxStore((s) => s.remove);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const consumeMessageId = useNavigationIntentStore((s) => s.consumeMessageId);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    ensureStationAnnouncementInbox();
    ensureAiNewsOverviewInbox();
  }, []);

  useEffect(() => {
    // 旧入口：AI 新闻总览意图改走顶栏 AI快讯
    const overview = consumeAiNewsOverview();
    if (overview.open) {
      setAppView('ai-brief');
      return;
    }
    const id = consumeMessageId();
    if (!id) return;
    if (id === 'ainews-overview' || id.startsWith('ainews-')) {
      setAppView('ai-brief');
      return;
    }
    setSelectedId(id);
    markRead(id);
  }, [consumeAiNewsOverview, consumeMessageId, markRead, messages.length, setAppView]);

  const platformMessages = useMemo(() => {
    void messages;
    const q = search.trim().toLowerCase();
    return useInboxStore
      .getState()
      .forUser(userId)
      .filter((m) => m.kind !== 'ai_news')
      .filter((m) => {
        if (!q) return true;
        return `${m.title} ${m.body} ${m.fromName}`.toLowerCase().includes(q);
      });
  }, [messages, userId, search]);

  const selected =
    platformMessages.find((m) => m.id === selectedId) ?? platformMessages[0] ?? null;

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="我的消息"
          subtitle="AI 平台系统与协作通知"
          tip={<>平台系统消息与协作通知。每日 AI 产业动态请看顶栏「AI快讯」。</>}
          actions={
            <>
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索平台消息…"
              />
              <button
                type="button"
                onClick={() => markAllRead(userId)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                全部已读
              </button>
            </>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white md:w-[300px]">
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
              {platformMessages.length === 0 ? (
                <p className="px-2 py-10 text-center text-[11px] text-zinc-400">暂无平台消息</p>
              ) : (
                platformMessages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id);
                      if (!m.read) markRead(m.id);
                    }}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition',
                      selected?.id === m.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-semibold">{m.title}</span>
                      {!m.read ? (
                        <span
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            selected?.id === m.id ? 'bg-amber-300' : 'bg-claw-600',
                          )}
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'truncate text-[10px]',
                        selected?.id === m.id ? 'text-white/55' : 'text-zinc-400',
                      )}
                    >
                      {m.fromName} · {inboxKindLabel(m.kind)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white p-4 md:p-5">
            {selected ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                        {inboxKindLabel(selected.kind)}
                      </span>
                      {!selected.read ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          未读
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-[16px] font-semibold text-zinc-900">{selected.title}</h2>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {selected.fromName}
                      {' · '}
                      {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      remove(selected.id);
                      setSelectedId(null);
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                  {selected.body}
                </p>
                {selected.meta?.warroomTitle || selected.meta?.query ? (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-[11px] text-zinc-500">
                    {selected.meta.warroomTitle ? (
                      <p>作战室：{selected.meta.warroomTitle}</p>
                    ) : null}
                    {selected.meta.query ? <p>任务：{selected.meta.query}</p> : null}
                  </div>
                ) : null}
                {selected.kind === 'deliverable' ? (
                  <button
                    type="button"
                    onClick={() => setAppView('task')}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    打开任务中心查看
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-zinc-400">
                选择左侧消息查看详情
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
