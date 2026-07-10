import type { PlatformTool } from '@/domain/tool';
import { getCredentialTypeLabel } from '@/domain/tool';

interface ToolInspectorPanelProps {
  tool: PlatformTool;
}

export function ToolInspectorPanel({ tool }: ToolInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel">
      <div className="p-4">
        <p className="section-label mb-3">引用情况</p>
        <div className="apple-card grid grid-cols-2 gap-2 p-3 text-center">
          <div>
            <p className="text-xl font-semibold text-claw-600">{tool.usedBySkills.length}</p>
            <p className="text-[10px] text-[#86868b]">Skill</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-claw-600">{tool.usedByAgents.length}</p>
            <p className="text-[10px] text-[#86868b]">Agent</p>
          </div>
        </div>
      </div>

      {(tool.usedBySkills.length > 0 || tool.usedByAgents.length > 0) && (
        <div className="border-t border-black/[0.05] p-4">
          <p className="section-label mb-2">被引用</p>
          <div className="flex flex-wrap gap-1.5">
            {tool.usedBySkills.map((s) => (
              <span key={s} className="rounded-lg bg-claw-50 px-2 py-1 text-[10px] font-medium text-zinc-700">
                {s}
              </span>
            ))}
            {tool.usedByAgents.map((a) => (
              <span key={a} className="rounded-lg bg-black/[0.04] px-2 py-1 text-[10px] font-medium text-[#6e6e73]">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-black/[0.05] p-4">
        <p className="section-label mb-3">安全</p>
        <dl className="space-y-2 text-[12px]">
          <Row label="认证" value={getCredentialTypeLabel(tool.credentialType)} />
          <Row label="审计" value="已启用" />
        </dl>
        <p className="mt-4 text-[10px] text-[#aeaeb2]">
          {tool.author} · {tool.updatedAt}
        </p>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#86868b]">{label}</dt>
      <dd className="font-medium text-[#1d1d1f]">{value}</dd>
    </div>
  );
}
