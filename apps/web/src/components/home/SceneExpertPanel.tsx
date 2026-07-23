import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { HOME_SECONDARY_PANEL_H } from '@/components/home/CardPageCarousel';
import { SectionToolbar } from '@/components/home/HomeScenePortal';

/**
 * 干 · 做任务 · 场景专家：全域门面精选（营销/知识等），不分区域/领域。
 * 组织视角筛选只作用于上方「场景技能」，此处不重复、也不按 org 过滤。
 */
export function SceneExpertPanel({
  agents,
  selectedId,
  onSelect,
  emptyText = '暂无精选专家，可先用上方场景技能；运营可在「配置专家」勾选精选露出',
}: {
  agents: PrototypeAgentSeed[];
  selectedId: string | null;
  onSelect: (agent: PrototypeAgentSeed) => void;
  emptyText?: string;
}) {
  const roleHint = (a: PrototypeAgentSeed) => {
    if (a.id === 'agent-marketing') return '问数 · 报告 · 分析';
    if (a.id === 'agent-knowledge') return '问答 · 陪练';
    return a.desc;
  };

  return (
    <section>
      <SectionToolbar
        title="场景专家"
        filters={
          <p className="truncate text-[11px] leading-none text-zinc-400">
            全域精选 · 不分区域/领域
          </p>
        }
      />
      <div
        className={cn(
          'flex min-h-0 flex-col justify-center rounded-xl border border-zinc-200/80 bg-white px-2 py-1.5',
          HOME_SECONDARY_PANEL_H,
        )}
      >
        <div className="flex min-h-0 items-center gap-2 overflow-x-auto px-0.5 scroll-hidden">
          {agents.map((a) => {
            const active = selectedId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                title={`${a.name}：${roleHint(a)}`}
                onClick={() => onSelect(a)}
                className={cn(
                  'flex w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-800 hover:bg-zinc-100/80',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-[12px]',
                    active ? 'bg-white/15' : 'bg-zinc-100 text-zinc-700',
                  )}
                >
                  <i className={cn('fa-solid', a.icon || 'fa-robot')} />
                </span>
                <span
                  className={cn(
                    'w-full truncate text-center text-[10px] font-medium leading-tight',
                    active ? 'text-white' : 'text-zinc-700',
                  )}
                >
                  {a.name.replace(/Agent$/, '').trim() || a.name}
                </span>
              </button>
            );
          })}
          {agents.length === 0 ? (
            <p className="px-2 text-[11px] text-zinc-400">{emptyText}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
