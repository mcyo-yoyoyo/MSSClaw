/**
 * [INPUT]: 读取表单字段值、变更回调和资产来源类型。
 * [OUTPUT]: 提供编辑控件、Skill 来源选择及弹窗操作按钮。
 * [POS]: 后台编辑与前台提报共用同一套 Skill 来源值。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import type { ReactNode } from 'react';
import type { AssetSourceType } from '@/domain/orgTaxonomy';
import { cn } from '@/lib/utils';

const fieldClass =
  'mt-1 w-full rounded-xl border border-black/8 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20';

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[#86868b]">{label}</span>
      {hint && <p className="mb-1 text-[10px] text-[#86868b]">{hint}</p>}
      {children}
    </label>
  );
}

export function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function FormTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, className)} {...props} />;
}

export function FormSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, className)} {...props} />;
}

export function SkillSourceField({ value, onChange }: {
  value?: AssetSourceType;
  onChange: (value: AssetSourceType | undefined) => void;
}) {
  return (
    <FormField label="Skill 来源" hint="内部表示公司自产，外部表示从公司外引入。未选择的 Skill 只在「全部」中展示。">
      <FormSelect
        aria-label="Skill 来源"
        value={value ?? ''}
        onChange={(event) => {
          const selected = event.target.value;
          onChange(selected === 'internal' || selected === 'external' ? selected : undefined);
        }}
      >
        <option value="">未选择</option>
        <option value="internal">内部</option>
        <option value="external">外部</option>
      </FormSelect>
    </FormField>
  );
}

export const EFFICIENCY_OPTIONS = [
  { value: 'office', label: '办公提效' },
  { value: 'manage', label: '管理提效' },
  { value: 'process', label: '流程提效' },
  { value: 'experience', label: '体验提升' },
] as const;

export const AGENT_CHAT_OPTIONS = [
  { value: 'marketing', label: '营销分析' },
  { value: 'knowledge', label: '知识问答' },
] as const;

export function ModalActions({
  onCancel,
  onSave,
  saveLabel = '保存',
  cancelFirst = false,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  cancelFirst?: boolean;
}) {
  const cancelButton = (
    <button type="button" onClick={onCancel} className="rounded-xl border border-black/8 px-4 py-2 text-[12px]">
        取消
    </button>
  );
  const saveButton = (
    <button
      type="button"
      onClick={onSave}
      className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
    >
      {saveLabel}
    </button>
  );
  return (
    <>
      {cancelFirst ? cancelButton : saveButton}
      {cancelFirst ? saveButton : cancelButton}
    </>
  );
}
