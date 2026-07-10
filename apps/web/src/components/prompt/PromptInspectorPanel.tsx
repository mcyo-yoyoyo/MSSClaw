import type { Prompt } from '@/domain/prompt';
import { PromptStatusBadge } from '@/components/prompt/PromptLifecycle';

interface PromptInspectorPanelProps {
  prompt: Prompt;
}

export function PromptInspectorPanel({ prompt }: PromptInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel w-[320px]">
      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Inspector</h3>
      </div>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Metadata</h4>
        <dl className="space-y-2 text-xs">
          <Row label="Version" value={prompt.version} />
          <Row label="Author" value={prompt.author} />
          <Row label="Updated" value={prompt.updatedAt} />
          <Row label="Status" value={<PromptStatusBadge lifecycle={prompt.lifecycle} />} />
          {prompt.evaluationScore !== undefined && (
            <Row label="Evaluation" value={`${Math.round(prompt.evaluationScore * 100)}% pass rate`} />
          )}
        </dl>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Variables</h4>
        <div className="space-y-2">
          {prompt.variables.map((variable) => (
            <div key={variable.name} className="rounded-lg border border-black/[0.06] bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <code className="text-[11px] font-bold text-claw-600">{`{{${variable.name}}}`}</code>
                <span className="text-[10px] text-[#aeaeb2]">{variable.type}</span>
              </div>
              <p className="text-[10px] text-[#86868b]">
                {variable.required ? 'Required' : 'Optional'}
                {variable.defaultValue ? ` · default: ${variable.defaultValue}` : ''}
              </p>
              {variable.description && <p className="mt-1 text-[10px] text-[#aeaeb2]">{variable.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Tags</h4>
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Version History</h4>
        <div className="space-y-2">
          {prompt.versions.map((version) => (
            <div key={version.version} className="rounded-lg border border-black/[0.06] bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#424245]">{version.version}</span>
                <PromptStatusBadge lifecycle={version.lifecycle} />
              </div>
              <p className="text-[10px] text-[#86868b]">{version.changelog}</p>
              <p className="mt-1 text-[9px] text-[#aeaeb2]">
                {version.author} · {version.updatedAt}
              </p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#aeaeb2]">{label}</dt>
      <dd className="text-right font-medium text-[#424245]">{value}</dd>
    </div>
  );
}
