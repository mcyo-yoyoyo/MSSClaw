import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  AGENT_CHAT_OPTIONS,
  EFFICIENCY_OPTIONS,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import type { EfficiencyCategory, PrototypeAgentSeed } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type EditorTarget = string | 'new' | null;

function emptyAgent(): PrototypeAgentSeed {
  return {
    id: '',
    name: '',
    desc: '',
    category: 'office',
    bizLine: 'MSS 全员',
    homeTag: 'mkt',
    author: 'Mcyo',
    published: false,
    invokes: 0,
    skillIds: [],
    chatId: 'marketing',
    icon: 'fa-robot',
    color: 'from-[#18181b] to-[#18181b]',
    systemPrompt: '',
  };
}

interface AgentEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function AgentEditorModal({ target, onClose }: AgentEditorModalProps) {
  const { agents, skills, upsertAgent, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeAgentSeed>(emptyAgent());

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setForm(emptyAgent());
      return;
    }
    const existing = agents.find((a) => a.id === target);
    setForm(existing ? { ...existing } : emptyAgent());
  }, [target, agents]);

  if (!target) return null;

  const isNew = target === 'new';
  const title = isNew ? '创建 Agent' : '配置 Agent';

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skillIds: f.skillIds.includes(skillId)
        ? f.skillIds.filter((id) => id !== skillId)
        : [...f.skillIds, skillId],
    }));
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写 Agent 名称');
      return;
    }
    const prev = !isNew ? agents.find((a) => a.id === target) : null;
    const category = form.category as EfficiencyCategory;
    upsertAgent({
      ...form,
      id: isNew ? `agent-${Date.now()}` : target,
      name,
      desc: form.desc.trim(),
      systemPrompt: form.systemPrompt?.trim() || '',
      category,
      bizLine: prev?.bizLine || getEfficiencyLabel(category),
      homeTag: prev?.homeTag ?? 'mkt',
      author: prev?.author ?? 'Mcyo',
      invokes: prev?.invokes ?? 0,
      icon: prev?.icon ?? 'fa-robot',
      color: prev?.color ?? 'from-[#18181b] to-[#18181b]',
    }, isNew);
    showToast(form.published ? 'Agent 已发布' : 'Agent 已保存（草稿）');
    onClose();
  };

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} />}
    >
      <div className="space-y-3 text-left">
        <FormField label="名称">
          <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        <FormField label="System Prompt">
          <FormTextarea
            rows={2}
            placeholder="角色与约束…"
            value={form.systemPrompt ?? ''}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="提效维度">
            <FormSelect
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as EfficiencyCategory })}
            >
              {EFFICIENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="任务类型">
            <FormSelect
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
            >
              {AGENT_CHAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
        <FormField label="挂载 Skill" hint="勾选后 Agent 执行计划将调用对应 Skill">
          <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-black/8 p-2">
            {skills.length ? (
              skills.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-black/[0.04] py-1.5 last:border-0"
                >
                  <input
                    type="checkbox"
                    className="accent-claw-600"
                    checked={form.skillIds.includes(s.id)}
                    onChange={() => toggleSkill(s.id)}
                  />
                  <span className="flex-1 text-[13px]">{s.name}</span>
                  <span className="mono text-[10px] text-claw-600">{s.command}</span>
                </label>
              ))
            ) : (
              <p className="p-2 text-[12px] text-[#86868b]">请先在 Skill 中心添加 Skill</p>
            )}
          </div>
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="accent-claw-600"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          <span className="text-[13px]">发布到 Agent 中心</span>
        </label>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as AgentEditorTarget };
