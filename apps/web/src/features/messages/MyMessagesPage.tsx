import { announcementDetail, announcementEvent, shareAnnouncement } from '@/api/announcementApi';
import { readAppRouteFromLocation } from '@/domain/appRoute';
import type { InboxMessage } from '@/domain/inbox';
import { useEffect, useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnnouncementBody } from '@/components/common/AnnouncementBody';
import {
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { inboxKindLabel, isVisibleInboxMessage } from '@/domain/inbox';
import { getCurrentUserId } from '@/domain/currentUser';
import { ensureAiNewsOverviewInbox } from '@/domain/aiNews';
import { ensureStationAnnouncementInbox } from '@/domain/stationAnnouncements';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

/** 默认只展示近一个月的消息；更早的折叠起来，需要时再展开 */
const RECENT_WINDOW_DAYS = 30;

export function MyMessagesPage() {
  const userId = getCurrentUserId();
  const messages = useInboxStore((s) => s.messages);
  const markRead = useInboxStore((s) => s.markRead);
  const markAllRead = useInboxStore((s) => s.markAllRead);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const consumeMessageId = useNavigationIntentStore((s) => s.consumeMessageId);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [link, setLink] = useState(readAppRouteFromLocation);
  const [linkedMessage, setLinkedMessage] = useState<InboxMessage | null>(null);
  const [linkError, setLinkError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    const sync = () => { setLink(readAppRouteFromLocation()); viewed.current = null; };
    window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => {
    setLinkedMessage(null); setLinkError('');
    if (!link.announcement || !userId) return;
    let cancelled = false;
    void announcementDetail(link.announcement).then(a => {
      if (cancelled) return;
      setLinkedMessage({id:a.id,kind:'announce',title:a.title,body:a.body,fromName:'能力运营',toUserId:'*',createdAt:a.publishedAt,read:true});
      setSelectedId(a.id); markRead(a.id);
    }).catch(() => { if (!cancelled) setLinkError('该公告未上架、已删除或无权查看'); });
    return () => { cancelled = true; };
  }, [link.announcement, userId, markRead]);

  useEffect(() => {
    // 运营刚发布的公告是服务端落库的广播消息，进页面拉一次才能直接展开全文。
    useInboxStore.getState().bootstrap();
  }, []);

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

  const matchedMessages = useMemo(() => {
    void messages;
    const q = search.trim().toLowerCase();
    return useInboxStore
      .getState()
      .forUser(userId)
      .filter(isVisibleInboxMessage)
      .filter((m) => {
        if (!q) return true;
        return `${m.title} ${m.body} ${m.fromName}`.toLowerCase().includes(q);
      });
  }, [messages, userId, search]);

  const recentMessages = useMemo(() => {
    const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return matchedMessages.filter((m) => {
      const at = Date.parse(m.createdAt);
      // 时间解析不出来的老数据当成「近期」，宁可多展示也不要凭空消失
      return !Number.isFinite(at) || at >= cutoff;
    });
  }, [matchedMessages]);

  const olderCount = matchedMessages.length - recentMessages.length;

  const platformMessages = useMemo(() => {
    if (showOlder) return matchedMessages;
    // 从首页公告条跳进来的那条可能已经超过一个月，不能因为窗口过滤就打不开
    if (selectedId && !recentMessages.some((m) => m.id === selectedId)) {
      const pinned = matchedMessages.find((m) => m.id === selectedId);
      if (pinned) return [...recentMessages, pinned];
    }
    return recentMessages;
  }, [matchedMessages, recentMessages, selectedId, showOlder]);

  const selected =
    link.announcement ? linkedMessage : platformMessages.find((m) => m.id === selectedId) ?? platformMessages[0] ?? null;

  useEffect(() => {
    if (!userId || !selected || selected.kind !== 'announce' || viewed.current === selected.id) return;
    viewed.current = selected.id;
    void announcementEvent(selected.id, 'view', link.announcement === selected.id && link.source === 'share' ? 'share' : 'system').catch(() => undefined);
  }, [selected?.id, userId, link.announcement, link.source]);

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="我的消息"
          subtitle="平台发布的站内公告"
          tip={
            <>
              运营发布的站内公告都会汇集在这里，默认展示近 {RECENT_WINDOW_DAYS} 天。
              每日 AI 产业动态请看顶栏「AI快讯」。
            </>
          }
          actions={
            <>
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索公告…"
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
                <p className="px-2 py-10 text-center text-[11px] text-zinc-400">
                  {olderCount > 0 ? `近 ${RECENT_WINDOW_DAYS} 天没有公告` : '暂无站内公告'}
                </p>
              ) : (
                platformMessages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setLink({view:'messages'});
                      window.history.replaceState(null, '', '#/messages');
                      viewed.current = null;
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
            {olderCount > 0 ? (
              <div className="border-t border-zinc-100 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setShowOlder((open) => !open)}
                  className="w-full rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  {showOlder
                    ? `仅看近 ${RECENT_WINDOW_DAYS} 天`
                    : `查看更早的 ${olderCount} 条公告`}
                </button>
              </div>
            ) : null}
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
                </div>
                {selected.kind === 'announce' && <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { void shareAnnouncement(selected.id).then(() => setShareNotice('链接已复制')).catch(error => setShareNotice(error.message)); }} className="rounded-lg border px-3 py-1.5 text-[12px]">分享链接</button>
                  <span className="text-[12px] text-zinc-500">{shareNotice}</span>
                </div>}
                {/* 公告正文可带图片，其它消息仍是纯文本 */}
                {selected.kind === 'announce' ? (
                  <AnnouncementBody body={selected.body} />
                ) : (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                    {selected.body}
                  </p>
                )}
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
                {linkError || (link.announcement ? '正在加载公告…' : '选择左侧公告查看全文')}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
