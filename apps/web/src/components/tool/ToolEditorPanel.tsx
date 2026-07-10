import type { PlatformTool } from '@/domain/tool';
import { getCredentialTypeLabel, TOOL_TYPE_META } from '@/domain/tool';
import { getToolStatusClass } from '@/components/tool/ToolListPanel';
import { cn } from '@/lib/utils';

interface ToolEditorPanelProps {
  tool: PlatformTool;
  testRunning: boolean;
  onTestConnection: () => void;
}

export function ToolEditorPanel({ tool, testRunning, onTestConnection }: ToolEditorPanelProps) {
  const meta = TOOL_TYPE_META[tool.type];

  return (
    <div className="studio-editor-panel">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', `bg-${meta.color}-50 border-${meta.color}-200`)}>
            <i className={cn('fa-solid text-lg', meta.icon, `text-${meta.color}-600`)} />
          </div>
          <div>
            <h2 className="font-mono text-lg font-bold text-[#1d1d1f]">{tool.name}</h2>
            <p className="text-xs text-[#86868b]">{tool.displayName}</p>
          </div>
        </div>
        <span className={cn('rounded border px-2.5 py-1 text-[10px] font-bold capitalize', getToolStatusClass(tool.status))}>
          {tool.status}
        </span>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto p-6">
        <div className="mx-auto grid max-w-3xl gap-4">
          <ConfigBlock title="Endpoint">
            <div className="space-y-2 font-mono text-[12px]">
              {tool.method && (
                <p>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold">{tool.method}</span>
                </p>
              )}
              <p className="break-all text-claw-600">{tool.endpoint}</p>
            </div>
          </ConfigBlock>

          <ConfigBlock title="Credential">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1d1d1f]">{getCredentialTypeLabel(tool.credentialType)}</p>
                <p className="text-[11px] text-[#86868b]">{tool.credentialLabel}</p>
              </div>
              <button type="button" className="rounded-lg border border-black/[0.06] px-3 py-1.5 text-[10px] font-bold text-[#6e6e73] hover:bg-black/[0.03]">
                <i className="fa-solid fa-key mr-1" /> 轮换密钥
              </button>
            </div>
          </ConfigBlock>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Rate Limit" value={tool.rateLimit} />
            <MiniStat label="Timeout" value={`${tool.timeoutMs}ms`} />
            <MiniStat label="Version" value={tool.version} />
          </div>

          <ConfigBlock title="OpenAPI / Schema">
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-[11px] text-green-400">
{`{
  "tool": "${tool.name}",
  "type": "${tool.type}",
  "input": { "query": "string", "filters": "object?" },
  "output": { "data": "array", "meta": "object" }
}`}
            </pre>
          </ConfigBlock>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onTestConnection}
              disabled={testRunning}
              className="apple-btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {testRunning ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" /> 测试中...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt" /> Test Connection
                </>
              )}
            </button>
            <button
              type="button"
              className="apple-btn-secondary rounded-xl px-5 py-2.5 text-[13px] font-semibold"
            >
              编辑 Manifest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#fafafa]/50 p-4">
      <h4 className="mb-3 text-[10px] font-bold uppercase text-[#86868b]">{title}</h4>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-center">
      <p className="text-[10px] font-bold uppercase text-[#aeaeb2]">{label}</p>
      <p className="mt-1 text-xs font-bold text-[#1d1d1f]">{value}</p>
    </div>
  );
}
