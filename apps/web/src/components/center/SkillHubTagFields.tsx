import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  hasSkillHubSecondaryTags,
  SKILL_CAPABILITY_GROUPS,
  SKILL_ENTITIES,
  SKILL_FORMATS,
  SKILL_HUB_STATUS_LABEL,
  SKILL_PURPOSE_GROUPS,
  SKILL_REGIONS,
  SKILL_ROLE_GROUPS,
  skillHubGroupsFor,
  type SkillHubTagField,
  type SkillHubTagStatus,
  type SkillHubTags,
  type SkillHubTermGroup,
} from '@/domain/skillHubTags';

function statusLabel(status: SkillHubTagStatus): string | null {
  return status === 'ok' ? null : SKILL_HUB_STATUS_LABEL[status];
}

function GroupChips({
  selected,
  field,
  onToggle,
}: {
  groups: readonly SkillHubTermGroup[];
  selected: readonly string[];
  field: SkillHubTagField;
  onToggle?: (field: SkillHubTagField, label: string) => void;
}) {
  return <FlatChips terms={[]} selected={selected} field={field} onToggle={onToggle} />;
}

function FlatChips({ selected, field, onToggle }: {
  terms: readonly string[];
  selected: readonly string[];
  field: SkillHubTagField;
  onToggle?: (field: SkillHubTagField, label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const add = () => {
    const label = draft.trim();
    if (!label) return;
    if (!selected.includes(label)) onToggle?.(field, label);
    setDraft('');
    setAdding(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map(term => <TagChip key={term} label={term} active onClick={onToggle ? () => onToggle(field, term) : undefined} />)}
      {onToggle && (adding ? (
        <div className="flex items-center gap-1">
          <input autoFocus aria-label="新标签" maxLength={50} value={draft} onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } if (event.key === 'Escape') { setAdding(false); setDraft(''); } }}
            placeholder="输入标签" className="w-32 rounded border border-zinc-300 px-2 py-1 text-[11px]" />
          <button type="button" onClick={add} className="text-[11px]">添加</button>
          <button type="button" onClick={() => { setAdding(false); setDraft(''); }} className="text-[11px] text-zinc-500">取消</button>
        </div>
      ) : <button type="button" aria-label="添加标签" title="添加标签" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600"><i className="fa-solid fa-plus" /></button>)}
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    'rounded-md border px-2 py-0.5 text-[11px]',
    active
      ? 'border-zinc-900 bg-zinc-900 font-medium text-white'
      : 'border-zinc-200 bg-white text-zinc-600',
  );
  if (!onClick) {
    return <span className={className}>{label}</span>;
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: SkillHubTagStatus }) {
  const label = statusLabel(status);
  if (!label) return null;
  return (
    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
      {label}
    </span>
  );
}

function SectionTitle({
  title,
  hint,
  status,
}: {
  title: string;
  hint?: string;
  status?: SkillHubTagStatus;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <p className="text-[12px] font-semibold text-zinc-800">{title}</p>
      {status ? <StatusBadge status={status} /> : null}
      {hint ? <span className="text-[10px] text-zinc-400">{hint}</span> : null}
    </div>
  );
}

export function SkillHubTagEditor({
  tags,
  showSecondary,
  onToggle,
  recognizing,
  onRecognize,
  onShowSecondary,
}: {
  tags?: SkillHubTags;
  showSecondary: boolean;
  recognizing?: boolean;
  onToggle: (field: SkillHubTagField, label: string) => void;
  onRecognize: () => void;
  onShowSecondary: () => void;
}) {
  const current = tags;
  const latest = current?.audits.at(-1);
  const secondaryVisible = showSecondary || hasSkillHubSecondaryTags(current);
  const roleGroups = current ? skillHubGroupsFor(SKILL_ROLE_GROUPS, current.roles) : [];
  const capabilityGroups = current
    ? skillHubGroupsFor(SKILL_CAPABILITY_GROUPS, current.capabilities)
    : [];
  const purposeGroups = current ? skillHubGroupsFor(SKILL_PURPOSE_GROUPS, current.purposes) : [];

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800">SkillHub 标签</p>
          <p className="text-[11px] text-zinc-500">
            模型识别后仅展示已选标签；点击标签可移除，点击 ＋ 可手动添加。
          </p>
        </div>
        <button
          type="button"
          onClick={onRecognize}
          disabled={recognizing}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {recognizing ? '识别中…' : '模型识别'}
        </button>
      </div>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        <section>
          <SectionTitle
            title="岗位职能"
            status={current?.roleStatus}
            hint={roleGroups.length ? `分组 ${roleGroups.join('、')}` : '按业务域分组，入库只存细岗位'}
          />
          <GroupChips
            groups={SKILL_ROLE_GROUPS}
            selected={current?.roles ?? []}
            field="roles"
            onToggle={onToggle}
          />
        </section>
        <section>
          <SectionTitle
            title="核心能力"
            status={current?.capabilityStatus}
            hint={capabilityGroups.length ? `聚类 ${capabilityGroups.join('、')}` : '四字聚类只用于筛选'}
          />
          <GroupChips
            groups={SKILL_CAPABILITY_GROUPS}
            selected={current?.capabilities ?? []}
            field="capabilities"
            onToggle={onToggle}
          />
        </section>
        <section>
          <SectionTitle
            title="产出用途"
            status={current?.purposeStatus}
            hint={purposeGroups.length ? `聚类 ${purposeGroups.join('、')}` : '检索使用细词条'}
          />
          <GroupChips
            groups={SKILL_PURPOSE_GROUPS}
            selected={current?.purposes ?? []}
            field="purposes"
            onToggle={onToggle}
          />
        </section>
        <section>
          <SectionTitle title="产出格式" status={current?.formatStatus} />
          <FlatChips
            terms={SKILL_FORMATS}
            selected={current?.formats ?? []}
            field="formats"
            onToggle={onToggle}
          />
        </section>
        {secondaryVisible ? (
          <section className="space-y-2 border-t border-zinc-200 pt-2">
            <p className="text-[12px] font-semibold text-zinc-800">次标签</p>
            <div>
              <p className="mb-1 text-[10px] font-medium text-zinc-400">细分实体/品类</p>
              <FlatChips
                terms={SKILL_ENTITIES}
                selected={current?.entities ?? []}
                field="entities"
                onToggle={onToggle}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-zinc-400">覆盖地域</p>
              <FlatChips
                terms={SKILL_REGIONS}
                selected={current?.regions ?? []}
                field="regions"
                onToggle={onToggle}
              />
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={onShowSecondary}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            补充次标签
          </button>
        )}
      </div>
      {latest ? (
        <p className="mt-2 text-[10px] text-zinc-400">
          {latest.by} · {latest.at.slice(0, 16).replace('T', ' ')} · {latest.summary}
        </p>
      ) : null}
    </div>
  );
}

export function SkillHubTagSummary({ tags }: { tags: SkillHubTags }) {
  const roleGroups = skillHubGroupsFor(SKILL_ROLE_GROUPS, tags.roles);
  const capabilityGroups = skillHubGroupsFor(SKILL_CAPABILITY_GROUPS, tags.capabilities);
  const purposeGroups = skillHubGroupsFor(SKILL_PURPOSE_GROUPS, tags.purposes);
  return (
    <div className="space-y-3">
      <SummaryRow
        title="岗位职能"
        labels={tags.roles}
        status={tags.roleStatus}
        hint={roleGroups.length ? `分组 ${roleGroups.join('、')}` : undefined}
      />
      <SummaryRow
        title="核心能力"
        labels={tags.capabilities}
        status={tags.capabilityStatus}
        hint={capabilityGroups.length ? `聚类 ${capabilityGroups.join('、')}` : undefined}
      />
      <SummaryRow
        title="产出用途"
        labels={tags.purposes}
        status={tags.purposeStatus}
        hint={purposeGroups.length ? `聚类 ${purposeGroups.join('、')}` : undefined}
      />
      <SummaryRow title="产出格式" labels={tags.formats} status={tags.formatStatus} />
      {hasSkillHubSecondaryTags(tags) ? (
        <div className="space-y-2 border-t border-zinc-100 pt-2">
          {tags.entities.length ? <SummaryRow title="细分实体/品类" labels={tags.entities} /> : null}
          {tags.regions.length ? <SummaryRow title="覆盖地域" labels={tags.regions} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({
  title,
  labels,
  status,
  hint,
}: {
  title: string;
  labels: readonly string[];
  status?: SkillHubTagStatus;
  hint?: string;
}) {
  return (
    <div>
      <SectionTitle title={title} status={status} hint={hint} />
      {labels.length ? (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <TagChip key={label} label={label} active />
          ))}
        </div>
      ) : null}
    </div>
  );
}
