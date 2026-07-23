import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import { OwnershipFormFields } from '@/components/center/OrgAssetFilters';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import type { AssetSourceType, AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { FIND_CASES_FEATURED_HINT } from '@/domain/capabilityShelf';
import { resolveToolFeaturedInFindCases } from '@/domain/plazaToolPicks';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';

type EditorTarget = string | 'new' | 'new-external' | null;

function emptyTool(asExternal: boolean): PrototypeToolSeed {
  const name = getCurrentUserName() || 'Mcyo';
  return {
    id: '',
    name: '',
    desc: '',
    category: asExternal ? 'external' : 'connector',
    author: name,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    published: true,
    invokes: 0,
    icon: asExternal ? 'fa-arrow-up-right-from-square' : 'fa-plug',
    tags: asExternal ? ['外部'] : [],
    sourceType: asExternal ? 'external' : 'internal',
    visibility: asExternal ? 'org' : 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    homepageUrl: '',
    connectorType: asExternal ? undefined : 'http',
  };
}

interface ToolEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function ToolEditorModal({ target, onClose }: ToolEditorModalProps) {
  const { tools, upsertTool, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeToolSeed>(emptyTool(false));

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setForm(emptyTool(false));
      return;
    }
    if (target === 'new-external') {
      setForm(emptyTool(true));
      return;
    }
    const existing = tools.find((t) => t.id === target);
    setForm(
      existing
        ? { ...existing, featuredInFindCases: resolveToolFeaturedInFindCases(existing) }
        : emptyTool(false),
    );
  }, [target, tools]);

  if (!target) return null;

  const isNew = target === 'new' || target === 'new-external';
  const title =
    target === 'new-external'
      ? '登记外部工具'
      : isNew
        ? '登记工具'
        : '编辑工具';

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写工具名称');
      return;
    }
    const sourceType = (form.sourceType ?? 'internal') as AssetSourceType;
    if (sourceType === 'external' && !form.homepageUrl?.trim()) {
      showToast('外部工具请填写访问链接');
      return;
    }
    const prev = !isNew ? tools.find((t) => t.id === target) : null;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `tool-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);

    upsertTool(
      {
        ...form,
        id,
        name,
        desc: form.desc.trim(),
        category: sourceType === 'external' ? 'external' : form.category === 'platform' ? 'platform' : 'connector',
        tags: form.tags,
        author: prev?.author ?? userName,
        publisher: form.publisher || userName,
        publisherUserId: form.publisherUserId || userId || undefined,
        invokes: prev?.invokes ?? 0,
        icon:
          prev?.icon ??
          (sourceType === 'external' ? 'fa-arrow-up-right-from-square' : 'fa-plug'),
        sourceType,
        visibility: (form.visibility ?? 'public') as AssetVisibility,
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
        kind: 'tool',
        assetId: id,
        assetName: name,
      });
      showToast('工具已保存，已进入上架审批');
    } else {
      showToast(form.published ? '工具已保存' : '工具已保存（草稿）');
    }
  };

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} saveLabel="保存并提交审批" />}
    >
      <div className="space-y-3 text-left">
        <FormField label="工具名称">
          <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
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
        {form.sourceType !== 'external' && (
          <FormField label="连接器类型">
            <FormSelect
              value={form.connectorType ?? 'http'}
              onChange={(e) => setForm({ ...form, connectorType: e.target.value })}
            >
              <option value="http">HTTP</option>
              <option value="mcp">MCP</option>
              <option value="openapi">OpenAPI</option>
              <option value="function">Function</option>
            </FormSelect>
          </FormField>
        )}

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
              category:
                (patch.sourceType ?? form.sourceType) === 'external' ? 'external' : form.category,
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
          <span className="text-[13px]">提交上架审批（能力上架）</span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 accent-claw-600"
            checked={Boolean(form.featuredInFindCases)}
            onChange={(e) => setForm({ ...form, featuredInFindCases: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-zinc-800">精选露出到「找案例 · 场景工具」</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
              {FIND_CASES_FEATURED_HINT}
            </span>
          </span>
        </label>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as ToolEditorTarget };
