import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import type { ContentEngagement } from '@/domain/contentEngagement';
import { heatScore } from '@/domain/contentEngagement';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

interface EngagementActionsProps {
  contentId: string;
  /** 展示用补充调用量（如工具 invokes） */
  baseUses?: number;
  compact?: boolean;
  className?: string;
  onAfterAction?: (action: 'like' | 'dislike' | 'download') => void;
  /** 提供时：计数后执行真实下载（如案例包） */
  onDownload?: () => void;
}

export function EngagementActions({
  contentId,
  baseUses = 0,
  compact = false,
  className,
  onAfterAction,
  onDownload,
}: EngagementActionsProps) {
  const byId = useContentEngagementStore((s) => s.byId);
  const userVotes = useContentEngagementStore((s) => s.userVotes);
  const get = useContentEngagementStore((s) => s.get);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);

  // 订阅 byId / userVotes 以保证互动后重渲染
  void byId;
  void userVotes;
  const e = get(contentId);
  const vote = userVotes[contentId] ?? null;

  const uses = e.uses + baseUses;
  const heat = Math.round(heatScore({ ...e, uses }));

  const stop = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1',
        compact ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
      onClick={stop}
    >
      <span className="tabular-nums text-zinc-400" title="热度">
        <i className="fa-solid fa-fire mr-0.5 text-[8px]" />
        {heat}
      </span>
      <button
        type="button"
        title="点赞"
        onClick={(ev) => {
          stop(ev);
          toggleLike(contentId);
          onAfterAction?.('like');
        }}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          vote === 'like' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-700',
        )}
      >
        <i className={cn('fa-solid fa-thumbs-up', compact ? 'text-[8px]' : 'text-[9px]')} />
        {e.likes}
      </button>
      <button
        type="button"
        title="点踩"
        onClick={(ev) => {
          stop(ev);
          toggleDislike(contentId);
          onAfterAction?.('dislike');
        }}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          vote === 'dislike' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-700',
        )}
      >
        <i className={cn('fa-solid fa-thumbs-down', compact ? 'text-[8px]' : 'text-[9px]')} />
        {e.dislikes}
      </button>
      <button
        type="button"
        title={onDownload ? '下载案例包' : '下载 / 收藏副本'}
        onClick={(ev) => {
          stop(ev);
          bumpDownload(contentId);
          onDownload?.();
          onAfterAction?.('download');
        }}
        className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-zinc-400 transition hover:text-zinc-700"
      >
        <i className={cn('fa-solid fa-download', compact ? 'text-[8px]' : 'text-[9px]')} />
        {e.downloads}
      </button>
    </div>
  );
}

export function formatEngagementLine(e: ContentEngagement, baseUses = 0): string {
  const uses = e.uses + baseUses;
  return `热${Math.round(heatScore({ ...e, uses }))} · 赞${e.likes} · 踩${e.dislikes} · 下${e.downloads} · 用${uses}`;
}
