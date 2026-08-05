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
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  EXTERNAL_TOOL_TYPES,
  type ExternalToolTypeId,
  type ToolRegion,
} from '@/domain/externalToolTaxonomy';
import { listVisibleExternalToolTypes } from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import type { MarketShelfKind } from '@/domain/marketShelf';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { useSessionStore } from '@/stores/sessionStore';

/** 外精选 / 公司推荐：提报工具（案例提报走 CaseEditorModal） */
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
  const externalTypeOptions = listVisibleExternalToolTypes(
    useExternalTaxonomyCatalogStore((s) => s.catalog),
  );

  const isExternal = kind === 'external';

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [businessId, setBusinessId] = useState<BusinessScenarioId>('S1');
  const [ownerDeptIds, setOwnerDeptIds] = useState<DeptId[]>([]);
  const [ownerRegionId, setOwnerRegionId] = useState<RegionId | null>(null);
  const [visibility, setVisibility] = useState<AssetVisibility>('org');
  const [region, setRegion] = useState<ToolRegion>('overseas');
  const [toolTypeId, setToolTypeId] = useState<ExternalToolTypeId>('general');
  const [cardSummary, setCardSummary] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setDesc('');
    setHomepageUrl('');
    setBusinessId('S1');
    setOwnerDeptIds((user?.deptIds ?? []) as DeptId[]);
    setOwnerRegionId((user?.regionId ?? null) as RegionId | null);
    setVisibility('org');
    setRegion('overseas');
    setToolTypeId('general');
    setCardSummary('');
    setCompany('');
  }, [open, user, kind]);

  if (!open || kind === 'projects') return null;

  const title = isExternal ? '提报外部工具' : '提报内部工具';

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('请填写工具名称');
      return;
    }
    if (isExternal && !homepageUrl.trim()) {
      showToast('外部工具请填写访问链接');
      return;
    }

    const userName = getCurrentUserName() || user?.name || '业务用户';
    const userId = getCurrentUserId() || user?.id;
    const id = `tool-submit-${Date.now()}`;
    const summary = cardSummary.trim();
    const tool: PrototypeToolSeed = {
      id,
      name: trimmed,
      desc: desc.trim() || summary || (isExternal ? '业务提报的外部工具' : '业务提报的内部工具'),
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
      marketShelf: isExternal ? 'external' : 'internal',
      connectorType: isExternal ? undefined : 'http',
      ...(isExternal
        ? {
            region,
            toolTypeId,
            cardSummary: summary || undefined,
            company: company.trim() || undefined,
          }
        : {}),
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
          提交后进入「业务主管 → MSS 质量与运营」审批。通过后由运营确认「上架货架」后出现在对应货架。
        </p>
        <FormField label="工具名称">
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="工具市场传播名"
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
        {isExternal ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="目录区域">
                <FormSelect
                  value={region}
                  onChange={(e) => setRegion(e.target.value as ToolRegion)}
                >
                  <option value="overseas">海外</option>
                  <option value="domestic">国内</option>
                </FormSelect>
              </FormField>
              <FormField label="工具类型">
                <FormSelect
                  value={toolTypeId}
                  onChange={(e) => setToolTypeId(e.target.value as ExternalToolTypeId)}
                >
                  {(externalTypeOptions.length ? externalTypeOptions : EXTERNAL_TOOL_TYPES).map(
                    (t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ),
                  )}
                </FormSelect>
              </FormField>
            </div>
            <FormField label="卡片摘要（可选）" hint="货架卡优先展示；可短于完整说明">
              <FormTextarea
                rows={2}
                value={cardSummary}
                onChange={(e) => setCardSummary(e.target.value)}
                placeholder="一句话核心作用"
              />
            </FormField>
            <FormField label="厂商 / 公司（可选）">
              <FormInput
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例：OpenAI"
              />
            </FormField>
          </>
        ) : null}
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
        <FormField label={isExternal ? '访问链接（必填）' : '访问链接（可选）'}>
          <FormInput
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            placeholder="https://"
          />
        </FormField>
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
          }}
        />
      </div>
    </CenterModal>
  );
}
