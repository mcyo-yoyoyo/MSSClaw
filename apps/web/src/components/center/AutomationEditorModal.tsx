import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { FormField, FormInput, FormSelect, FormTextarea, ModalActions } from '@/components/center/CenterFormFields';
import type { PrototypeAutomation } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';

type EditorTarget = string | 'new' | null;

function emptyAutomation(): PrototypeAutomation {
  return {
    id: '',
    name: '',
    desc: '',
    agentId: 'agent-meeting',
    skillIds: [],
    schedule: '每日 18:00',
    enabled: true,
    lastRun: '未运行',
  };
}

interface AutomationEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function AutomationEditorModal({ target, onClose }: AutomationEditorModalProps) {
  const { agents, automations, upsertAutomation, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeAutomation>(emptyAutomation());

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setForm({
        ...emptyAutomation(),
        agentId: agents[0]?.id ?? 'agent-meeting',
      });
      return;
    }
    const existing = automations.find((a) => a.id === target);
    setForm(existing ? { ...existing } : emptyAutomation());
  }, [target, automations, agents]);

  if (!target) return null;

  const isNew = target === 'new';

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写名称');
      return;
    }
    const prev = !isNew ? automations.find((a) => a.id === target) : null;
    const agent = agents.find((a) => a.id === form.agentId);
    const id = isNew ? `auto-${Date.now()}` : (target as string);
    const needsApproval = isNew;

    upsertAutomation(
      {
        ...form,
        id,
        name,
        desc: form.desc.trim(),
        agentId: form.agentId,
        skillIds: agent?.skillIds ?? prev?.skillIds ?? [],
        schedule: form.schedule.trim() || '每日',
        enabled: needsApproval ? false : (prev?.enabled ?? form.enabled),
        lastRun: prev?.lastRun ?? '未运行',
      },
      isNew,
    );
    onClose();
    if (needsApproval) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'automation',
        assetId: id,
        assetName: name,
      });
      showToast('自动化已保存，已进入上架审批');
    } else {
      showToast('自动化已保存');
    }
  };

  return (
    <CenterModal
      open
      title={isNew ? '新建自动化' : '编辑自动化'}
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
        <FormField label="绑定 Agent">
          <FormSelect
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="调度">
          <FormInput
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          />
        </FormField>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as AutomationEditorTarget };
