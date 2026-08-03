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
import {
  BUSINESS_SCENARIO_FEATURED_DISCOVER,
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { FEATURED_SCENARIOS } from '@/domain/portalMap';
import type { MarketShelfKind } from '@/domain/marketShelf';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { useSessionStore } from '@/stores/sessionStore';

function scenarioTagsForBusiness(biz: BusinessScenarioId): string[] {
  const discoverId = BUSINESS_SCENARIO_FEATURED_DISCOVER[biz];
  const def = FEATURED_SCENARIOS.find((s) => s.id === discoverId);
  return def?.matchTags?.length ? [...def.matchTags] : [biz];
}

export function MarketSubmitModal({
  kind,
  open,
  onClose,
}: {
  kind: MarketShelfKind;
  open: boolean;
  onClose: () => void;
}) {
  const user = useSessionStore((s) => s.user);
  const upsertTool = useMarketplaceStore((s) => s.upsertTool);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);

  const isProject = kind === 'projects';
  const isExternal = kind === 'external';

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [businessId, setBusinessId] = useState<BusinessScenarioId>('S1');
  const [painPoint, setPainPoint] = useState('');
  const [impactMetric, setImpactMetric] = useState('');
  const [ownerDeptIds, setOwnerDeptIds] = useState<DeptId[]>([]);
  const [ownerRegionId, setOwnerRegionId] = useState<RegionId | null>(null);
  const [visibility, setVisibility] = useState<AssetVisibility>('org');

  useEffect(() => {
    if (!open) return;
    setName('');
    setDesc('');
    setHomepageUrl('');
    setBusinessId('S1');
    setPainPoint('');
    setImpactMetric('');
    setOwnerDeptIds((user?.deptIds ?? []) as DeptId[]);
    setOwnerRegionId((user?.regionId ?? null) as RegionId | null);
    setVisibility('org');
  }, [open, user, kind]);

  if (!open) return null;

  const title = isProject
    ? '提报 AI 项目'
    : isExternal
      ? '提报外部工具'
      : '提报内部工具';

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast(isProject ? '请填写项目名称' : '请填写工具名称');
      return;
    }
    if (!isProject && isExternal && !homepageUrl.trim()) {
      showToast('外部工具请填写访问链接');
      return;
    }

    const userName = getCurrentUserName() || user?.name || '业务用户';
    const userId = getCurrentUserId() || user?.id;

    if (isProject) {
      const id = `portal-submit-${Date.now()}`;
      const item: PortalContentItem = {
        id,
        type: 'case',
        title: trimmed,
        desc: desc.trim() || '业务提报项目（待运营完善）',
        icon: 'fa-lightbulb',
        ownerDeptIds,
        ownerRegionId,
        publisher: userName,
        publisherUserId: userId,
        sourceType: 'internal',
        visibility,
        homepageUrl: homepageUrl.trim() || undefined,
        publishedAt: new Date().toISOString().slice(0, 10),
        scenarioTags: scenarioTagsForBusiness(businessId),
        published: false,
        painPoint: painPoint.trim() || undefined,
        impactMetric: impactMetric.trim() || undefined,
        steps: ['查看 How to 了解场景', '准备体外条件', '在样板间深入探索'],
      };
      upsertItem(item, true);
      onClose();
      useAssetApprovalStore.getState().openApproval({
        kind: 'portal',
        assetId: id,
        assetName: trimmed,
        reasons: ['publish_executable'],
      });
      showToast('项目已提报，进入上架审批');
      return;
    }

    const id = `tool-submit-${Date.now()}`;
    const tool: PrototypeToolSeed = {
      id,
      name: trimmed,
      desc: desc.trim() || (isExternal ? '业务提报的外部工具' : '业务提报的内部工具'),
      category: isExternal ? 'external' : 'platform',
      author: userName,
      publisher: userName,
      publisherUserId: userId,
      published: false,
      invokes: 0,
      icon: isExternal ? 'fa-arrow-up-right-from-square' : 'fa-plug',
      tags: isExternal ? ['ai-saas', '外部', '提报'] : ['hw-internal', '内部', '提报'],
      sourceType: isExternal ? 'external' : 'internal',
      visibility,
      ownerDeptIds,
      ownerRegionId,
      homepageUrl: homepageUrl.trim() || undefined,
      businessScenarioIds: [businessId],
      connectorType: isExternal ? undefined : 'http',
    };
    upsertTool(tool, true);
    onClose();
    useAssetApprovalStore.getState().openApproval({
      kind: 'tool',
      assetId: id,
      assetName: trimmed,
      reasons: ['publish_executable'],
    });
    showToast('工具已提报，进入上架审批');
  };

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      actions={
        <ModalActions onCancel={onClose} onSave={handleSubmit} saveLabel="提交审批" />
      }
    >
      <div className="space-y-3 text-left">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          提交后进入「业务主管 → MSS 质量与运营」审批。
          {isProject
            ? '通过后材料并入所选业务场景的 AI 项目 How to。'
            : '通过后出现在对应货架（需带上架标签）。'}
        </p>
        <FormField label={isProject ? '项目名称' : '工具名称'}>
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isProject ? '传播名 / 市场名称' : '工具市场传播名'}
          />
        </FormField>
        <FormField label="应用场景说明">
          <FormTextarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="一句话说明适用场景与价值"
          />
        </FormField>
        <FormField label="业务场景">
          <FormSelect
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value as BusinessScenarioId)}
          >
            {listVisibleBusinessScenarioCategories().map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        {isProject ? (
          <>
            <FormField label="业务痛点（可选）">
              <FormInput
                value={painPoint}
                onChange={(e) => setPainPoint(e.target.value)}
                placeholder="当前痛点"
              />
            </FormField>
            <FormField label="预期成效（可选）">
              <FormInput
                value={impactMetric}
                onChange={(e) => setImpactMetric(e.target.value)}
                placeholder="如：人效提升 / 周期缩短"
              />
            </FormField>
            <FormField label="演示 / 文档链接（可选）">
              <FormInput
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                placeholder="https://"
              />
            </FormField>
          </>
        ) : (
          <FormField label={isExternal ? '访问链接（必填）' : '访问链接（可选）'}>
            <FormInput
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              placeholder="https://"
            />
          </FormField>
        )}
        <OwnershipFormFields
          ownerDeptIds={ownerDeptIds}
          ownerRegionId={ownerRegionId}
          sourceType={isExternal ? 'external' : 'internal'}
          visibility={visibility}
          homepageUrl={homepageUrl}
          onChange={(patch) => {
            if (patch.ownerDeptIds) setOwnerDeptIds(patch.ownerDeptIds as DeptId[]);
            if (patch.ownerRegionId !== undefined) {
              setOwnerRegionId(patch.ownerRegionId as RegionId | null);
            }
            if (patch.visibility) setVisibility(patch.visibility);
            if (patch.homepageUrl !== undefined) setHomepageUrl(patch.homepageUrl);
            // 来源由货架 kind 锁定，忽略 sourceType 变更
          }}
        />
      </div>
    </CenterModal>
  );
}
