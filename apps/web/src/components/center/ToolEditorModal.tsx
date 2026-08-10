import { useEffect, useMemo, useState } from 'react';
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
import {
  MARKET_SHELF_SLOT_HINT,
} from '@/domain/capabilityShelf';
import {
  ensureMarketShelfTags,
  resolveToolMarketShelf,
  type MarketShelfSlot,
} from '@/domain/aiToolCategories';
import { resolveToolFeaturedInFindCases } from '@/domain/plazaToolPicks';
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { resolveToolBusinessScenarios } from '@/domain/toolBusinessScenarios';
import {
  type ExternalToolTypeId,
  type ToolRegion,
} from '@/domain/externalToolTaxonomy';
import { listVisibleExternalToolTypes } from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { shareSyncSaveHint } from '@/domain/shareSync';

const LOGO_MAX_BYTES = 512 * 1024;

function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error('Logo 请小于 512KB'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

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
    tags: asExternal ? ['外部', 'ai-saas'] : [],
    sourceType: asExternal ? 'external' : 'internal',
    visibility: asExternal ? 'org' : 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    homepageUrl: '',
    connectorType: asExternal ? undefined : 'http',
    marketShelf: asExternal ? 'external' : 'none',
    marketTitle: '',
    businessScenarioIds: [],
    featuredInFindCases: false,
    region: asExternal ? ('overseas' as ToolRegion) : undefined,
    toolTypeId: asExternal ? ('general' as ExternalToolTypeId) : undefined,
    cardSummary: '',
    company: '',
    productIntro: '',
    bestFor: '',
    mediaUrl: '',
    screenshotUrl: '',
  };
}

interface ToolEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function ToolEditorModal({ target, onClose }: ToolEditorModalProps) {
  const { tools, upsertTool, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeToolSeed>(emptyTool(false));
  const externalTaxonomy = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const externalTypeOptions = useMemo(() => {
    const visible = listVisibleExternalToolTypes(externalTaxonomy);
    const current = form.toolTypeId
      ? externalTaxonomy.types.find((t) => t.id === form.toolTypeId)
      : undefined;
    if (current && !visible.some((t) => t.id === current.id)) {
      return [...visible, current];
    }
    return visible;
  }, [externalTaxonomy, form.toolTypeId]);

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
    if (!existing) {
      setForm(emptyTool(false));
      return;
    }
    setForm({
      ...existing,
      marketShelf: existing.marketShelf ?? resolveToolMarketShelf(existing),
      marketTitle: existing.marketTitle ?? '',
      businessScenarioIds: resolveToolBusinessScenarios(existing),
      featuredInFindCases: resolveToolFeaturedInFindCases(existing),
    });
  }, [target, tools]);

  if (!target) return null;

  const isNew = target === 'new' || target === 'new-external';
  const title =
    target === 'new-external'
      ? '登记外部工具'
      : isNew
        ? '登记工具'
        : '编辑工具';

  const shelf = (form.marketShelf ?? 'none') as MarketShelfSlot;
  const scenarioCats = listVisibleBusinessScenarioCategories();

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      showToast('请填写工具名称');
      return;
    }
    const marketShelf = (form.marketShelf ?? 'none') as MarketShelfSlot;
    const sourceType = (
      marketShelf === 'external'
        ? 'external'
        : marketShelf === 'internal'
          ? 'internal'
          : (form.sourceType ?? 'internal')
    ) as AssetSourceType;
    if (sourceType === 'external' && !form.homepageUrl?.trim()) {
      showToast('外部工具请填写访问链接');
      return;
    }
    const prev = !isNew ? tools.find((t) => t.id === target) : null;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `tool-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);
    const tags = ensureMarketShelfTags(form.tags ?? [], marketShelf);
    const marketTitle = form.marketTitle?.trim() || undefined;
    const businessScenarioIds = (form.businessScenarioIds ?? []) as BusinessScenarioId[];

    upsertTool(
      {
        ...form,
        id,
        name,
        desc: form.desc.trim(),
        category:
          sourceType === 'external'
            ? 'external'
            : form.category === 'platform'
              ? 'platform'
              : 'connector',
        tags,
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
        marketShelf,
        marketTitle: marketShelf === 'external' ? marketTitle : undefined,
        businessScenarioIds: businessScenarioIds.length ? businessScenarioIds : undefined,
        featuredInFindCases: marketShelf === 'none' ? false : Boolean(form.featuredInFindCases),
        ...(sourceType === 'external' || marketShelf === 'external'
          ? {
              region: (form.region ?? 'overseas') as ToolRegion,
              toolTypeId: (form.toolTypeId ?? 'general') as ExternalToolTypeId,
              cardSummary: form.cardSummary?.trim() || undefined,
              company: form.company?.trim() || undefined,
              productIntro: form.productIntro?.trim() || undefined,
              bestFor: form.bestFor?.trim() || undefined,
              mediaUrl: form.mediaUrl?.trim() || undefined,
              screenshotUrl: form.screenshotUrl?.trim() || undefined,
            }
          : {
              region: undefined,
              toolTypeId: undefined,
              cardSummary: undefined,
              company: undefined,
            }),
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
      showToast('工具已保存，已进入上架审批' + shareSyncSaveHint());
    } else {
      showToast((form.published ? '工具已保存' : '工具已保存（草稿）') + shareSyncSaveHint());
    }
  };

  const toggleScenario = (id: BusinessScenarioId) => {
    const cur = new Set(form.businessScenarioIds ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    setForm({ ...form, businessScenarioIds: [...cur] as BusinessScenarioId[] });
  };

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} saveLabel="保存并提交审批" />}
    >
      <div className="space-y-3 text-left">
        <FormField label="工具名称（产品名）">
          <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        {(form.sourceType === 'external' || shelf === 'external') && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="目录区域（海外 / 国内）" hint="决定外精选双栏与筛选统计">
                <FormSelect
                  value={form.region ?? 'overseas'}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value as ToolRegion })
                  }
                >
                  <option value="overseas">海外</option>
                  <option value="domestic">国内</option>
                </FormSelect>
              </FormField>
              <FormField label="工具类型" hint="对应「按工具类型」筛选芯片">
                <FormSelect
                  value={(form.toolTypeId as string) || 'general'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      toolTypeId: e.target.value as ExternalToolTypeId,
                    })
                  }
                >
                  {externalTypeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>
            <FormField label="卡片摘要" hint="货架卡优先展示；可短于完整描述">
              <FormTextarea
                rows={2}
                value={form.cardSummary ?? ''}
                onChange={(e) => setForm({ ...form, cardSummary: e.target.value })}
                placeholder="一句话说明核心作用"
              />
            </FormField>
            <FormField label="厂商 / 公司">
              <FormInput
                value={form.company ?? ''}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="例：OpenAI"
              />
            </FormField>
            <FormField label="产品介绍">
              <FormTextarea
                rows={3}
                value={form.productIntro ?? ''}
                onChange={(e) => setForm({ ...form, productIntro: e.target.value })}
                placeholder="详情页概览展示"
              />
            </FormField>
            <FormField label="最适合">
              <FormInput
                value={form.bestFor ?? ''}
                onChange={(e) => setForm({ ...form, bestFor: e.target.value })}
                placeholder="例：需要可追溯来源的研究问答"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="截图 URL">
                <FormInput
                  value={form.screenshotUrl ?? ''}
                  onChange={(e) => setForm({ ...form, screenshotUrl: e.target.value })}
                  placeholder="https://… 图片地址"
                />
              </FormField>
              <FormField label="演示 / 介绍媒体 URL">
                <FormInput
                  value={form.mediaUrl ?? ''}
                  onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  placeholder="https://… 视频或介绍页"
                />
              </FormField>
            </div>
          </>
        )}
        {(shelf === 'external' ||
          shelf === 'internal' ||
          form.sourceType === 'external' ||
          form.marketShelf === 'internal') && (
          <FormField
            label="品牌 Logo"
            hint={
              shelf === 'internal' || form.marketShelf === 'internal'
                ? '公司工具推荐统一使用华为 Logo，无需单独上传。'
                : '外精选展示用。可上传；不传则按官网地址自动取 favicon。'
            }
          >
            <div className="flex items-center gap-3">
              <ToolLogo
                name={form.name || '工具'}
                logoUrl={resolveToolLogoUrl(form)}
                icon={form.icon}
                size={40}
                className="rounded-xl"
              />
              {shelf === 'internal' || form.marketShelf === 'internal' ? (
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  已绑定华为品牌标识，与货架展示一致。
                </p>
              ) : (
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                    className="block w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void readLogoFile(file)
                        .then((dataUrl) => {
                          setForm({ ...form, logoUrl: dataUrl });
                          showToast('Logo 已上传');
                        })
                        .catch((err: Error) => showToast(err.message || '上传失败'));
                    }}
                  />
                  {form.logoUrl ? (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                      onClick={() => setForm({ ...form, logoUrl: undefined })}
                    >
                      清除上传，改用官网自动 Logo
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </FormField>
        )}
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
        {form.sourceType !== 'external' && shelf !== 'external' && (
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
              marketShelf:
                patch.sourceType === 'external'
                  ? 'external'
                  : patch.sourceType === 'internal' && form.marketShelf === 'external'
                    ? 'internal'
                    : form.marketShelf,
            })
          }
        />

        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-semibold text-zinc-700">货架陈列</p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            外部工具的上架与精选置顶请在{' '}
            <strong className="font-semibold text-zinc-700">门户运营 · 货架运营</strong>{' '}
            配置。公司推荐前台为办公场景网格，请在本页维护场景工具的链接 / Logo。本页只维护工具主数据。
          </p>
          {shelf !== 'none' ? (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-1.5 text-[11px] text-emerald-800">
              当前货架：
              {shelf === 'external' ? '外部工具精选' : '公司工具推荐（场景引用）'}
              {form.marketTitle?.trim() ? ` · ${form.marketTitle.trim()}` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-400">当前未上架到业务货架（可在门户运营上架外部工具）。</p>
          )}
          <details className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-zinc-600">
              高级：本工具建议货架（可选，仍推荐以门户为准）
            </summary>
            <div className="mt-2 space-y-2.5">
              <FormField label="建议货架">
                <FormSelect
                  value={shelf}
                  onChange={(e) => {
                    const next = e.target.value as MarketShelfSlot;
                    setForm({
                      ...form,
                      marketShelf: next,
                      sourceType:
                        next === 'external'
                          ? 'external'
                          : next === 'internal'
                            ? 'internal'
                            : form.sourceType,
                      category: next === 'external' ? 'external' : form.category,
                      featuredInFindCases: next === 'none' ? false : form.featuredInFindCases,
                    });
                  }}
                >
                  <option value="none">不上架（仅配置目录）</option>
                  <option value="external">外部工具精选</option>
                  <option value="internal">公司工具推荐</option>
                </FormSelect>
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">{MARKET_SHELF_SLOT_HINT}</p>
              </FormField>
              {shelf === 'external' ? (
                <FormField label="应用场景标题">
                  <FormInput
                    value={form.marketTitle ?? ''}
                    placeholder="例：竞品舆情监控 · 市场洞察"
                    onChange={(e) => setForm({ ...form, marketTitle: e.target.value })}
                  />
                </FormField>
              ) : null}
              {shelf !== 'none' ? (
                <FormField
                  label="业务场景（组织轴）"
                  hint={
                    shelf === 'external'
                      ? '仅用于左侧领域/区域相关组织筛选；外精选「按工具类型 / 工作场景」请用上方目录区域与工具类型字段。'
                      : '用于组织轴场景筛选与 MSS 关联；公司推荐主界面由办公场景字典驱动，不由此勾选决定。'
                  }
                >
                  <div className="flex flex-wrap gap-1.5">
                    {scenarioCats.map((c) => {
                      const on = (form.businessScenarioIds ?? []).includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleScenario(c.id)}
                          className={
                            on
                              ? 'rounded-lg border border-claw-500/40 bg-claw-50 px-2 py-1 text-[11px] font-medium text-claw-800'
                              : 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:border-zinc-300'
                          }
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
              ) : null}
            </div>
          </details>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="accent-claw-600"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          <span className="text-[13px]">提交上架审批（能力上架）</span>
        </label>
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as ToolEditorTarget };
