import { useMemo, useState } from 'react';
import type { Prompt } from '@/domain/prompt';
import { PromptLifecycleBar } from '@/components/prompt/PromptLifecycle';
import { cn } from '@/lib/utils';

interface PromptEditorPanelProps {
  prompt: Prompt;
  onAdvanceLifecycle: () => void;
}

export function PromptEditorPanel({ prompt, onAdvanceLifecycle }: PromptEditorPanelProps) {
  const [tab, setTab] = useState<'template' | 'playground'>('template');

  const preview = useMemo(() => {
    let rendered = prompt.template;
    prompt.variables.forEach((variable) => {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'),
        variable.defaultValue ?? `[${variable.name}]`,
      );
    });
    return rendered;
  }, [prompt]);

  return (
    <div className="studio-editor-panel">
      <PromptLifecycleBar lifecycle={prompt.lifecycle} onAdvance={onAdvanceLifecycle} />

      <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-3">
        <div>
          <h2 className="text-lg font-bold text-[#1d1d1f]">{prompt.name}</h2>
          <p className="text-xs text-[#86868b]">{prompt.description}</p>
        </div>
        <div className="flex rounded-lg border border-black/[0.06] bg-black/[0.04] p-0.5">
          {(['template', 'playground'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                'rounded-md px-4 py-1.5 text-xs font-bold transition',
                tab === item ? 'bg-white text-claw-600 shadow-sm' : 'text-[#86868b]',
              )}
            >
              {item === 'template' ? 'Template' : 'Playground'}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto p-6">
        {tab === 'template' ? (
          <pre className="rounded-xl border border-black/[0.06] bg-slate-900 p-5 font-mono text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap">
            {prompt.template}
          </pre>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-claw-600">Rendered Preview</h4>
              <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#424245]">{preview}</pre>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-[#fafafa] p-6 text-center text-sm text-[#86868b]">
              <i className="fa-solid fa-flask mb-2 text-zinc-500" />
              <p>Playground 评测将在 V2.1 接入 Prompt Evaluation API</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
