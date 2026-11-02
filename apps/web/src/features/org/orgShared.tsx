import type { ReactNode } from 'react';
import type { AppView } from '@/domain/appView';
import { cn } from '@/lib/utils';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';

/** 当前角色在这个页面能否新增、修改、删除（只读时按钮全部隐藏） */
export function useOrgEditable(view: AppView): boolean {
  useSessionStore((s) => s.editableMenus);
  return useNavPresentationStore.getState().isViewEditable(view);
}

export function notify(message: string) {
  useConversationStore.setState({ pushToast: message });
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败';
}

export const btn = {
  primary: 'apple-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50',
  secondary:
    'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50',
  link: 'text-[12px] font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40',
  danger: 'text-[12px] font-medium text-rose-600 hover:text-rose-700 disabled:opacity-40',
};

export function Pill({ tone = 'zinc', children }: { tone?: 'zinc' | 'green' | 'amber' | 'rose' | 'blue'; children: ReactNode }) {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  };
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset', tones[tone])}>
      {children}
    </span>
  );
}

export function ReadOnlyHint() {
  return (
    <p className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-600">
      <i className="fa-solid fa-eye mr-1.5 text-zinc-400" />
      当前角色对这个页面只有查看权限。
    </p>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{message}</p>;
}
