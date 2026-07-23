import { useState } from 'react';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { AutomationEditorModal, type AutomationEditorTarget } from '@/components/center/AutomationEditorModal';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface AutomationCenterPageProps {
  onRun: (automationId: string, agentId: string, name: string) => void;
}

export function AutomationCenterPage({ onRun }: AutomationCenterPageProps) {
  const { agents, automations, toggleAutomation, markAutomationRun, showToast } = useMarketplaceStore();
  const [editorTarget, setEditorTarget] = useState<AutomationEditorTarget>(null);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl">
        <CenterPageHeader
          title="自动化设置"
          subtitle="定时任务 · 告警触发 · 周报生成 · Workflow 调度"
          tip={
            <>
              每条自动化绑定一个 Agent 与触发规则。启用后点击「立即运行」会跳转到任务中心执行，适合定时周报与告警场景。
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => setEditorTarget('new')}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
            >
              <i className="fa-solid fa-plus mr-1" />
              新建自动化
            </button>
          }
        />

        <div className="space-y-3">
          {automations.map((a) => {
            const agent = agents.find((ag) => ag.id === a.agentId);
            return (
              <div
                key={a.id}
                className="apple-card flex flex-col gap-3 p-4 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-zinc-900">{a.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        a.enabled ? 'bg-claw-50 text-zinc-700' : 'bg-black/[0.04] text-[#86868b]'
                      }`}
                    >
                      {a.enabled ? '运行中' : '已暂停'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#86868b]">{a.desc}</p>
                  <p className="mt-2 text-[11px] text-[#86868b]">
                    <i className="fa-solid fa-robot mr-1 text-claw-600" />
                    {agent?.name ?? a.agentId}
                    <i className="fa-solid fa-clock ml-2 mr-1" />
                    {a.schedule} · 上次 {a.lastRun}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      markAutomationRun(a.id);
                      onRun(a.id, a.agentId, a.name);
                      showToast(`自动化「${a.name}」已触发`);
                    }}
                    className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    立即运行
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(a.id)}
                    className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                  >
                    {a.enabled ? '暂停' : '启用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(a.id)}
                    className="rounded-xl border border-black/8 px-3 py-2 transition hover:bg-black/[0.03]"
                  >
                    <i className="fa-solid fa-pen text-[12px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AutomationEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
