import type { PlatformTool, ToolType } from '@/domain/tool';
import { getToolStatusClass, TOOL_TYPE_META } from '@/domain/tool';
import { cn } from '@/lib/utils';
import {
  StudioFilterChip,
  StudioListPanelHeader,
} from '@/components/studio/StudioShell';

interface ToolListPanelProps {
  tools: PlatformTool[];
  selectedToolId: string | null;
  typeFilter: ToolType | 'all';
  onSelect: (id: string) => void;
  onTypeFilterChange: (filter: ToolType | 'all') => void;
}

export function ToolListPanel({
  tools,
  selectedToolId,
  typeFilter,
  onSelect,
  onTypeFilterChange,
}: ToolListPanelProps) {
  return (
    <aside className="studio-list-panel">
      <StudioListPanelHeader
        title="Tool 中心"
        subtitle="HTTP · MCP · OpenAPI · 函数"
      />

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StudioFilterChip active={typeFilter === 'all'} onClick={() => onTypeFilterChange('all')} label="全部" />
          {(['http', 'mcp', 'openapi', 'function'] as ToolType[]).map((type) => (
            <StudioFilterChip
              key={type}
              active={typeFilter === type}
              onClick={() => onTypeFilterChange(type)}
              label={TOOL_TYPE_META[type].label}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-1.5 overflow-y-auto p-3">
        {tools.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] text-[#86868b]">暂无 Tool · 点击底部注册</p>
        ) : (
          tools.map((tool) => {
            const meta = TOOL_TYPE_META[tool.type];
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelect(tool.id)}
                className={cn(
                  'studio-list-item',
                  selectedToolId === tool.id && 'active',
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <i className={cn('fa-solid text-xs text-claw-600', meta.icon)} />
                  <code className="truncate text-[11px] font-semibold text-[#1d1d1f]">{tool.name}</code>
                </div>
                <p className="mb-2 line-clamp-1 text-[11px] text-[#86868b]">{tool.displayName}</p>
                <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize', getToolStatusClass(tool.status))}>
                  {tool.status}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-black/[0.05] p-3">
        <button
          type="button"
          className="apple-btn-secondary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold"
        >
          <i className="fa-solid fa-plus text-claw-600" /> 注册 Tool
        </button>
      </div>
    </aside>
  );
}

export { getToolStatusClass };
