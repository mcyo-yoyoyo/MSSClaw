import type { ReactNode } from 'react';
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
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onSave}
        className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
      >
        {saveLabel}
      </button>
      <button type="button" onClick={onCancel} className="rounded-xl border border-black/8 px-4 py-2 text-[12px]">
        取消
      </button>
    </>
  );
}
