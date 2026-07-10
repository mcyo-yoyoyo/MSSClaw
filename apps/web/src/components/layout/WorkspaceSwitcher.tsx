import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Workspace } from '@/domain/workspace';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  current: Workspace;
  onSwitch: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({ current, onSwitch }: WorkspaceSwitcherProps) {
  const workspaceList = useWorkspaceStore((state) => state.workspaceList);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={rootRef} className="relative border-b border-black/[0.05] p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50/40"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-claw-600 text-white shadow-sm">
          <i className="fa-solid fa-building text-sm" />
        </div>
        <div className="min-w-0 flex-grow">
          <p className="truncate text-sm font-bold text-[#1d1d1f]">{current.name}</p>
          <p className="truncate text-[10px] text-[#86868b]">
            ns/{current.namespace} · {current.memberCount} 成员
          </p>
        </div>
        <i className={cn('fa-solid fa-chevron-down text-xs text-[#aeaeb2] transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-xl">
          {workspaceList.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => {
                onSwitch(workspace.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition',
                workspace.id === current.id ? 'bg-claw-50' : 'hover:bg-black/[0.03]',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white',
                  workspace.id === current.id ? 'bg-claw-600' : 'bg-[#fafafa]0',
                )}
              >
                <i className="fa-solid fa-layer-group text-xs" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1d1d1f]">{workspace.name}</p>
                <p className="text-[10px] text-[#86868b]">{workspace.description}</p>
              </div>
              {workspace.id === current.id && (
                <i className="fa-solid fa-check ml-auto text-xs text-claw-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
