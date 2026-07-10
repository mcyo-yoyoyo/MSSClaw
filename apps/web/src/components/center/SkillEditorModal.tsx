import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  EFFICIENCY_OPTIONS,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useToolStore } from '@/stores/toolStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type EditorTarget = string | 'new' | null;

function emptySkill(): PrototypeSkillSeed {
  return {
    id: '',
    name: '',
    desc: '',
    category: 'office',
    command: '',
    author: 'Mcyo',
    version: '1.0.0',
    connector: '',
    published: true,
    invokes: 0,
    icon: 'fa-cube',
    tags: [],
  };
}

interface SkillEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function SkillEditorModal({ target, onClose }: SkillEditorModalProps) {
  const { skills, upsertSkill, showToast } = useMarketplaceStore();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const tools = useToolStore((s) => s.tools);
  const loadTools = useToolStore((s) => s.loadWorkspace);
  const [form, setForm] = useState<PrototypeSkillSeed>(emptySkill());

  useEffect(() => {
    if (!target) return;
    loadTools(workspaceId);
  }, [target, loadTools, workspaceId]);

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setForm(emptySkill());
      return;
    }
    const existing = skills.find((s) => s.id === target);
    setForm(existing ? { ...existing } : emptySkill());
  }, [target, skills]);

  if (!target) return null;

  const isNew = target === 'new';

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写 Skill 名称');
      return;
    }
    const prev = !isNew ? skills.find((s) => s.id === target) : null;
    let cmd = form.command.trim() || `/${name.toLowerCase()}`;
    if (!cmd.startsWith('/')) cmd = `/${cmd}`;

    upsertSkill(
      {
        ...form,
        id: isNew ? `skill-${Date.now()}` : target,
        name,
        desc: form.desc.trim(),
        category: form.category as EfficiencyCategory,
        command: cmd,
        version: form.version.trim() || '1.0.0',
        connector: form.connector.trim(),
        tags: form.tags,
        author: prev?.author ?? 'Mcyo',
        invokes: prev?.invokes ?? 0,
        icon: prev?.icon ?? 'fa-cube',
      },
      isNew,
    );
    showToast(form.published ? 'Skill 已发布到 Skill 中心' : 'Skill 已保存（草稿）');
    onClose();
  };

  return (
    <CenterModal
      open
      title={isNew ? '新建 Skill' : '编辑 Skill'}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} />}
    >
      <div className="space-y-3 text-left">
        <FormField label="Skill 名称">
          <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="调用指令">
            <FormInput
              placeholder="/my-skill"
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
            />
          </FormField>
          <FormField label="版本">
            <FormInput
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </FormField>
        </div>
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
          <FormField label="连接器（Tool）">
            <FormSelect
              value={form.connector}
              onChange={(e) => setForm({ ...form, connector: e.target.value })}
            >
              <option value="">— 选择 Tool / 连接器 —</option>
              {tools.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.type})
                </option>
              ))}
            </FormSelect>
            <FormInput
              className="mt-2"
              placeholder="或手动输入连接器名称"
              value={form.connector}
              onChange={(e) => setForm({ ...form, connector: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="标签（逗号分隔）">
          <FormInput
            value={form.tags.join(', ')}
            onChange={(e) =>
              setForm({
                ...form,
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="accent-claw-600"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          <span className="text-[13px]">发布到 Skill 中心</span>
        </label>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as SkillEditorTarget };
