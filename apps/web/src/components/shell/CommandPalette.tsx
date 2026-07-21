import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

import { buildAppCommands, filterAppCommands, type AppCommandHandlers } from '@/domain/commands';
import { canExecuteChat } from '@/domain/permissions';

import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface CommandPaletteProps {
  handlers: AppCommandHandlers;
}

export function CommandPalette({ handlers }: CommandPaletteProps) {
  const { open, query, selectedIndex, closePalette, setQuery, setSelectedIndex } =
    useCommandPaletteStore();

  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const isViewEnabled = useNavPresentationStore((s) => s.isViewEnabled);
  const platformRole = useSessionStore((s) => s.user?.platformRole);
  const canExecute = canExecuteChat(platformRole);

  const commands = useMemo(
    () =>
      buildAppCommands(
        handlers,
        {
          agents: agents.filter((a) => a.published).map((a) => ({ id: a.id, name: a.name, icon: a.icon })),
          skills: skills.filter((s) => s.published).map((s) => ({ id: s.id, name: s.name, command: s.command })),
        },
        { isViewEnabled, canExecute },
      ),
    [handlers, agents, skills, isViewEnabled, canExecute],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, panelRef);

  const filtered = filterAppCommands(commands, query);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector('.cmd-item.active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex, filtered.length]);

  const runAt = (index: number) => {
    const cmd = filtered[index];
    if (!cmd) return;
    closePalette();
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]"
      onClick={(e) => e.target === e.currentTarget && closePalette()}
    >
      <div ref={panelRef} className="w-full max-w-xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5">
          <i className="fa-solid fa-terminal text-sm text-claw-600" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="输入命令或搜索…"
            className="flex-1 text-[14px] text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none"
          />
          <span className="mono rounded-md border border-black/8 bg-[#fafafa] px-1.5 py-0.5 text-[10px] text-[#86868b]">
            ESC
          </span>
        </div>

        <div ref={listRef} className="scroll-hidden max-h-80 overflow-y-auto py-1">
          {filtered.length ? (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => runAt(i)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  'cmd-item flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px]',
                  i === selectedIndex && 'active',
                )}
              >
                <i className={cn('fa-solid w-4 text-claw-600', cmd.icon)} />
                <span className="text-[#1d1d1f]">{cmd.label}</span>
              </button>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-[13px] text-[#86868b]">无匹配命令</p>
          )}
        </div>
      </div>
    </div>
  );
}
