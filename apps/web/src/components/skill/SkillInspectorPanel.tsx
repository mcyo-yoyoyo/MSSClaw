import type { Skill } from '@/domain/skill';
import { SkillLifecycleBadge } from '@/components/skill/SkillListPanel';

interface SkillInspectorPanelProps {
  skill: Skill;
}

export function SkillInspectorPanel({ skill }: SkillInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel">
      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Inspector</h3>
      </div>

      <section className="border-b border-black/[0.06] p-4">
        <SkillLifecycleBadge lifecycle={skill.lifecycle} />
        <dl className="mt-3 space-y-2 text-xs">
          <Row label="Version" value={skill.version} />
          <Row label="Author" value={skill.author} />
          <Row label="Updated" value={skill.updatedAt} />
          <Row label="Tools" value={String(skill.toolNames.length)} />
          <Row label="Dependencies" value={String(skill.dependsOn.length)} />
        </dl>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Policy</h4>
        <div className="space-y-2 text-[11px] text-[#6e6e73]">
          <p>
            <span className="font-bold text-[#1d1d1f]">Retry:</span> {skill.retry}x on failure
          </p>
          <p>
            <span className="font-bold text-[#1d1d1f]">Timeout:</span> {skill.timeoutMs}ms hard limit
          </p>
          <p>
            <span className="font-bold text-[#1d1d1f]">Memory:</span> {skill.memoryPolicy}
          </p>
        </div>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Tags</h4>
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Impact Radius</h4>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-black/[0.06] bg-white p-3">
            <p className="text-lg font-bold text-claw-600">{skill.usedByAgents.length}</p>
            <p className="text-[10px] text-[#86868b]">Agents</p>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white p-3">
            <p className="text-lg font-bold text-violet-600">{skill.usedByWorkflows.length}</p>
            <p className="text-[10px] text-[#86868b]">Workflows</p>
          </div>
        </div>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#aeaeb2]">{label}</dt>
      <dd className="font-medium text-[#424245]">{value}</dd>
    </div>
  );
}
