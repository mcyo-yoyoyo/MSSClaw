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
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';

type EditorTarget = string | 'new' | null;

function emptyAgent(): PrototypeAgentSeed {
  const name = getCurrentUserName() || 'Mcyo';
  return {
    id: '',
    name: '',
    desc: '',
    category: 'office',
    bizLine: 'MSS 全员',
    homeTag: 'mkt',
    author: name,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    published: false,
    invokes: 0,
    skillIds: [],
    primarySkillId: undefined,
    demoPrompt: '',
    planSteps: [],
    chatId: 'marketing',
    icon: 'fa-robot',
    color: 'from-[#18181b] to-[#18181b]',
    systemPrompt: '',
  };
}

function normalizeAgent(agent: PrototypeAgentSeed): PrototypeAgentSeed {
  return {
    ...emptyAgent(),
    ...agent,
    skillIds: Array.isArray(agent.skillIds) ? agent.skillIds : [],
    planSteps: Array.isArray(agent.planSteps) ? agent.planSteps : [],
    systemPrompt: agent.systemPrompt ?? '',
    demoPrompt: agent.demoPrompt ?? '',
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
    setForm(existing ? normalizeAgent(existing) : emptyAgent());
  }, [target, agents]);

  if (!target) return null;

  const isNew = target === 'new';
  const title = isNew ? '创建专家' : '配置专家';

  const toggleSkill = (skillId: string) => {
    setForm((f) => {
      const nextIds = f.skillIds.includes(skillId)
        ? f.skillIds.filter((id) => id !== skillId)
        : [...f.skillIds, skillId];
      const primarySkillId =
        f.primarySkillId && nextIds.includes(f.primarySkillId)
          ? f.primarySkillId
          : nextIds[0];
      return { ...f, skillIds: nextIds, primarySkillId };
    });
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写 Agent 名称');
      return;
    }
    if (!form.systemPrompt?.trim()) {
      showToast('请填写 Persona（人设）');
      return;
    }
    const prev = !isNew ? agents.find((a) => a.id === target) : null;
    const category = form.category as EfficiencyCategory;
    const id = isNew ? `agent-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);
    const planSteps = (form.planSteps ?? []).map((s) => s.trim()).filter(Boolean);
    upsertAgent(
      {
        ...form,
        id,
        name,
        desc: form.desc.trim(),
        systemPrompt: form.systemPrompt?.trim() || '',
        demoPrompt: form.demoPrompt?.trim() || undefined,
        primarySkillId: form.primarySkillId || form.skillIds[0],
        planSteps: planSteps.length ? planSteps : undefined,
        category,
        bizLine: prev?.bizLine || getEfficiencyLabel(category),
        homeTag: prev?.homeTag ?? 'mkt',
        author: prev?.author ?? (getCurrentUserName() || 'Mcyo'),
        publisher: form.publisher || getCurrentUserName() || 'Mcyo',
        publisherUserId: form.publisherUserId || getCurrentUserId() || undefined,
        invokes: prev?.invokes ?? 0,
        icon: prev?.icon ?? 'fa-robot',
        color: prev?.color ?? 'from-[#18181b] to-[#18181b]',
        published: needsApproval ? false : form.published,
      },
      isNew,
    );
    onClose();
    if (needsApproval) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'agent',
        assetId: id,
        assetName: name,
      });
      showToast('专家已保存，已进入上架审批');
    } else {
      showToast(form.published ? '专家已保存' : '专家已保存（草稿）');
    }
  };

  return (
    <CenterModal
      open
      elevate
      size="lg"
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
        <FormField label="Persona（人设）" hint="对话执行时注入的角色与约束">
          <FormTextarea
            rows={4}
            className="font-mono text-[12px]"
            placeholder="角色定位、默认 Skill、输出结构与边界…"
            value={form.systemPrompt ?? ''}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          />
        </FormField>
        <FormField
          label="演示任务（调用时自动发送）"
          hint="建议包含 @专家名 与主 Skill 的 /指令"
        >
          <FormTextarea
            rows={3}
            className="font-mono text-[12px]"
            placeholder={`@${form.name || '专家名'} /技能指令 请基于演示样例…`}
            value={form.demoPrompt ?? ''}
            onChange={(e) => setForm({ ...form, demoPrompt: e.target.value })}
          />
        </FormField>
        <FormField label="编排计划（每行一步）" hint="多 Skill 编排步骤；留空则用主 Skill 计划">
          <FormTextarea
            rows={4}
            className="font-mono text-[12px]"
            placeholder={'挂载主 Skill\n执行辅助 Skill\n汇总行动建议'}
            value={(form.planSteps ?? []).join('\n')}
            onChange={(e) =>
              setForm({
                ...form,
                planSteps: e.target.value
                  .split('\n')
                  .map((s) => s.trimEnd())
                  .filter((s) => s.trim().length > 0),
              })
            }
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
        <FormField label="挂载 Skill" hint="勾选后可编排；主 Skill 决定默认 /指令">
          <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-black/8 p-2">
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
                  {form.primarySkillId === s.id ? (
                    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                      主
                    </span>
                  ) : form.skillIds.includes(s.id) ? (
                    <button
                      type="button"
                      className="text-[9px] text-zinc-400 hover:text-sky-700"
                      onClick={(e) => {
                        e.preventDefault();
                        setForm({ ...form, primarySkillId: s.id });
                      }}
                    >
                      设为主
                    </button>
                  ) : null}
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
          <span className="text-[13px]">提交上架审批</span>
        </label>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as AgentEditorTarget };
