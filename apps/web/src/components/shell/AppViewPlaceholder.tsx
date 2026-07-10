import type { AppView } from '@/domain/appView';
import { APP_VIEW_PLACEHOLDERS } from '@/domain/appView';

interface AppViewPlaceholderProps {
  view: AppView;
}

export function AppViewPlaceholder({ view }: AppViewPlaceholderProps) {
  const copy = APP_VIEW_PLACEHOLDERS[view];
  if (!copy) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto scroll-hidden bg-zinc-50 px-6 py-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 shadow-lg shadow-black/10">
        <i className={`fa-solid ${copy.icon} text-lg text-white`} />
      </div>
      <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-zinc-900">{copy.title}</h2>
      <p className="mb-4 max-w-md text-center text-[12px] leading-relaxed text-zinc-500">
        {copy.description}
      </p>
      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[10px] font-semibold text-zinc-600">
        {copy.phase} · 即将接入
      </span>
    </div>
  );
}
