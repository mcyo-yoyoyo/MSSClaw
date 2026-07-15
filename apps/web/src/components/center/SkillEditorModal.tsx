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
import { OwnershipFormFields } from '@/components/center/OrgAssetFilters';
import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { AssetSourceType, AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';

type EditorTarget = string | 'new' | null;

function emptySkill(): PrototypeSkillSeed {
  const name = getCurrentUserName() || 'Mcyo';
  return {
    id: '',
    name: '',
    desc: '',
    category: 'office',
    command: '',
    author: name,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    version: '1.0.0',
    connector: '',
    published: true,
    invokes: 0,
    icon: 'fa-cube',
    tags: [],
    sourceType: 'internal',
    visibility: 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    homepageUrl: '',
  };
}

interface SkillEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function SkillEditorModal({ target, onClose }: SkillEditorModalProps) {
  const { skills, tools, upsertSkill, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeSkillSeed>(emptySkill());

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
    if (form.sourceType === 'external' && !form.homepageUrl?.trim()) {
      showToast('外部 Skill/工具请填写链接');
      return;
    }
    const prev = !isNew ? skills.find((s) => s.id === target) : null;
    let cmd = form.command.trim() || `/${name.toLowerCase()}`;
    if (!cmd.startsWith('/')) cmd = `/${cmd}`;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `skill-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);

    upsertSkill(
      {
        ...form,
        id,
        name,
        desc: form.desc.trim(),
        category: form.category as EfficiencyCategory,
        command: cmd,
        version: form.version.trim() || '1.0.0',
        connector: form.connector.trim(),
        tags: form.tags,
        author: prev?.author ?? userName,
        publisher: form.publisher || userName,
        publisherUserId: form.publisherUserId || userId || undefined,
        invokes: prev?.invokes ?? 0,
        icon: prev?.icon ?? 'fa-cube',
        sourceType: form.sourceType ?? 'internal',
        visibility: form.visibility ?? 'public',
        ownerDeptIds: (form.ownerDeptIds ?? []) as DeptId[],
        ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
        homepageUrl: form.homepageUrl?.trim() || undefined,
        published: needsApproval ? false : form.published,
      },
      isNew,
    );
    onClose();
    if (needsApproval) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'skill',
        assetId: id,
        assetName: name,
      });
      showToast('技能已保存，已进入上架审批');
    } else {
      showToast(form.published ? '技能已保存' : '技能已保存（草稿）');
    }
  };

  return (
    <CenterModal
      open
      title={isNew ? '创建技能' : '编辑技能'}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} />}
    >
      <div className="space-y-3 text-left">
        <FormField label="技能名称">
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
                  {t.name}
                  {t.sourceType === 'external' ? '（外部）' : ''}
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

        <OwnershipFormFields
          ownerDeptIds={form.ownerDeptIds ?? []}
          ownerRegionId={form.ownerRegionId ?? null}
          sourceType={(form.sourceType ?? 'internal') as AssetSourceType}
          visibility={(form.visibility ?? 'public') as AssetVisibility}
          homepageUrl={form.homepageUrl}
          onChange={(patch) =>
            setForm({
              ...form,
              ...patch,
              ownerDeptIds: (patch.ownerDeptIds as DeptId[] | undefined) ?? form.ownerDeptIds,
              ownerRegionId:
                patch.ownerRegionId !== undefined
                  ? (patch.ownerRegionId as RegionId | null)
                  : form.ownerRegionId,
            })
          }
        />

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

export type { EditorTarget as SkillEditorTarget };
