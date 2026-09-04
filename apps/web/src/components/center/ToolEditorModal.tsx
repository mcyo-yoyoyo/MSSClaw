import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getLobeIconCDN } from '@lobehub/icons/es/features/getLobeIconCDN/index.js';
import { toc, type IconToc } from '@lobehub/icons/es/toc.js';
import { CenterModal } from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/center/CenterFormFields';
import { OwnershipFormFields } from '@/components/center/OrgAssetFilters';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import type { AssetSourceType, AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import {
  ensureMarketShelfTags,
  resolveConfiguredToolMarketShelf,
  type MarketShelfSlot,
} from '@/domain/aiToolCategories';
import type { BusinessScenarioId } from '@/domain/businessScenarios';
import { resolveToolBusinessScenarios } from '@/domain/toolBusinessScenarios';
import {
  type ExternalToolTypeId,
  type ToolRegion,
} from '@/domain/externalToolTaxonomy';
import {
  defaultExternalTaxonomyCatalog,
  externalToolTypeEntryIsSelected,
  externalToolTypeSelectionLabels,
  listVisibleExternalToolTypes,
  resolveExternalToolTypeSelection,
  toggleExternalToolTypeSelection,
  type ExternalTaxonomyCatalog,
} from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { resolvePersistedToolLogoUrl, resolveToolLogoUrl } from '@/domain/toolLogo';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { cn } from '@/lib/utils';

const LOGO_MAX_BYTES = 512 * 1024;

const LOBE_ICON_GROUP_LABEL: Record<IconToc['group'], string> = {
  application: 'AI 应用',
  provider: '模型与服务商',
  model: '模型',
};

const LOBE_ICON_GROUP_ORDER: IconToc['group'][] = ['application', 'provider', 'model'];
const LOBE_ICON_OPTIONS = [...toc].sort((a, b) =>
  a.fullTitle.localeCompare(b.fullTitle, 'zh-CN'),
);
const LOBE_ICON_ID_BY_SLUG = new Map(
  LOBE_ICON_OPTIONS.map((icon) => [icon.id.toLowerCase(), icon.id]),
);

function resolveLobeIconId(logoUrl: string | null | undefined): string {
  const raw = (logoUrl ?? '').trim();
  if (!raw) return '';
  try {
    const path = new URL(raw).pathname;
    if (!path.includes('/@lobehub/icons-static-svg/')) return '';
    const filename = path.split('/').pop() ?? '';
    if (!filename.endsWith('.svg')) return '';
    const slug = filename.slice(0, -4).replace(/-color$/, '');
    return LOBE_ICON_ID_BY_SLUG.get(slug) ?? '';
  } catch {
    return '';
  }
}

function lobeIconLogoUrl(icon: IconToc): string {
  return getLobeIconCDN(icon.id, {
    cdn: 'aliyun',
    format: 'svg',
    type: icon.param.hasColor ? 'color' : 'mono',
  });
}

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
    published: false,
    invokes: 0,
    icon: asExternal ? 'fa-arrow-up-right-from-square' : 'fa-plug',
    tags: [],
    sourceType: asExternal ? 'external' : 'internal',
    visibility: asExternal ? undefined : 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    homepageUrl: '',
    connectorType: asExternal ? undefined : 'http',
    marketShelf: asExternal ? 'external' : 'none',
    marketTitle: '',
    businessScenarioIds: [],
    region: undefined,
    toolTypeId: undefined,
    toolTypeIds: [],
    toolTypeLabels: [],
    cardSummary: '',
    company: '',
    productIntro: '',
    bestFor: '',
    coreCapabilities: [],
    docsUrl: '',
    mediaUrl: '',
    screenshotUrl: '',
  };
}

interface ToolEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

function ToolTypeMultiSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: ExternalTaxonomyCatalog;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const panelId = useId();
  const visibleTypes = listVisibleExternalToolTypes(catalog);
  const selectedLabels = externalToolTypeSelectionLabels(value, catalog);
  const knownIds = new Set(catalog.types.map((type) => type.id));
  const hiddenSelected = catalog.types.filter(
    (type) => type.visible === false && value.includes(type.id),
  );
  const unknownSelected = value.filter((id) => !knownIds.has(id as ExternalToolTypeId));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const buttonText =
    selectedLabels.length === 0
      ? '请选择用户页分类'
      : selectedLabels.length <= 2
        ? selectedLabels.join('、')
        : `${selectedLabels.slice(0, 2).join('、')} 等`;
  const accessibleSelection = selectedLabels.length
    ? selectedLabels.join('、')
    : '请选择用户页分类';

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span id={labelId} className="text-[11px] font-semibold text-[#86868b]">
        用户页分类标签（必填，可多选）
      </span>
      <p className="mb-1 text-[10px] leading-relaxed text-[#86868b]">
        与“外部工具精选”分类条保持一致；内部工具可预配置，仅进入外部货架后参与筛选。
      </p>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`用户页分类标签：${accessibleSelection}`}
        aria-required="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-[13px] transition',
          open
            ? 'border-zinc-400 bg-white ring-2 ring-zinc-900/10'
            : 'border-black/8 bg-white hover:border-zinc-300',
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate',
            selectedLabels.length ? 'text-zinc-800' : 'text-zinc-400',
          )}
        >
          {buttonText}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[10px] text-zinc-400">
          {value.length ? `${selectedLabels.length} 项` : ''}
          <i className={cn('fa-solid fa-chevron-down transition', open && 'rotate-180')} />
        </span>
      </button>

      {open ? (
        <div
          className="mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_12px_32px_-20px_rgba(24,24,27,0.5)]"
        >
          <div id={panelId} role="group" aria-labelledby={labelId}>
            <div className="grid gap-1 p-1.5 sm:grid-cols-2">
              {visibleTypes.map((type) => {
                const selected = externalToolTypeEntryIsSelected(value, type);
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onChange(toggleExternalToolTypeSelection(value, type, catalog))
                    }
                    className={cn(
                      'flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition',
                      selected
                        ? 'bg-zinc-900 font-medium text-white'
                        : 'text-zinc-700 hover:bg-zinc-50',
                    )}
                  >
                    <i
                      className={cn(
                        'fa-solid w-4 shrink-0 text-center text-[11px]',
                        type.icon,
                        selected ? 'text-white/80' : 'text-zinc-400',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{type.label}</span>
                    {selected ? (
                      <i className="fa-solid fa-check text-[9px]" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {hiddenSelected.length || unknownSelected.length ? (
              <div className="border-t border-zinc-100 px-2.5 py-2">
                <p className="mb-1.5 text-[10px] font-medium text-zinc-400">
                  已隐藏 / 旧分类（点击可移除）
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ...hiddenSelected.map((type) => ({ id: type.id, label: type.label })),
                    ...unknownSelected.map((id) => ({ id, label: id })),
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      aria-pressed="true"
                      onClick={() => onChange(value.filter((id) => id !== type.id))}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800"
                    >
                      {type.label} <i className="fa-solid fa-xmark ml-1" aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {value.length ? (
            <div className="flex justify-end border-t border-zinc-100 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800"
              >
                清空选择
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ToolEditorModal({ target, onClose }: ToolEditorModalProps) {
  const { tools, saveToolNow, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeToolSeed>(emptyTool(false));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const externalTaxonomy = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const toolTypeCatalog = useMemo(
    () =>
      externalTaxonomy.types.length ? externalTaxonomy : defaultExternalTaxonomyCatalog(),
    [externalTaxonomy],
  );

  useEffect(() => {
    if (!target) return;
    setSaving(false);
    setSaveError(null);
    if (target === 'new') {
      setForm(emptyTool(false));
      return;
    }
    if (target === 'new-external') {
      setForm(emptyTool(true));
      return;
    }
    const existing = useMarketplaceStore.getState().tools.find((t) => t.id === target);
    if (!existing) {
      setForm(emptyTool(false));
      return;
    }
    setForm({
      ...existing,
      marketShelf:
        existing.marketShelf ?? resolveConfiguredToolMarketShelf(existing),
      marketTitle: existing.marketTitle ?? '',
      businessScenarioIds: resolveToolBusinessScenarios(existing),
    });
  }, [target]);

  if (!target) return null;

  const isNew = target === 'new' || target === 'new-external';
  const title = isNew ? '添加工具' : '编辑工具';
  const existingTool = !isNew ? tools.find((tool) => tool.id === target) : undefined;

  const shelf = (form.marketShelf ?? 'none') as MarketShelfSlot;
  const autoPublishInternal = shelf === 'internal';
  const selectedLobeIconId = resolveLobeIconId(form.logoUrl);

  const handleSave = async () => {
    if (saving) return;
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
    if (sourceType === 'external' && !form.region) {
      showToast('请选择目录区域');
      return;
    }
    if (sourceType === 'external' && !form.visibility) {
      showToast('请选择可见性');
      return;
    }
    const selectedToolTypeIds = resolveExternalToolTypeSelection(
      form,
    ) as ExternalToolTypeId[];
    if (!selectedToolTypeIds.length) {
      showToast('请选择用户页分类');
      return;
    }
    const selectedToolTypeLabels = externalToolTypeSelectionLabels(
      selectedToolTypeIds,
      toolTypeCatalog,
    );
    const prev = existingTool;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `tool-${Date.now()}` : (target as string);
    // 内部工具保存即上架；外部工具仍保持原有上架状态。
    const wantsPublish = autoPublishInternal || Boolean(form.published);
    const needsApproval = wantsPublish && !Boolean(prev?.published) && !autoPublishInternal;
    const tags = ensureMarketShelfTags(form.tags ?? [], marketShelf);
    const marketTitle = form.marketTitle?.trim() || undefined;
    const businessScenarioIds = (form.businessScenarioIds ?? []) as BusinessScenarioId[];
    const nextTool: PrototypeToolSeed = {
      ...form,
      id,
      name,
      desc:
        sourceType === 'external'
          ? form.cardSummary?.trim() || form.productIntro?.trim() || ''
          : form.desc.trim(),
      category:
        sourceType === 'external'
          ? 'external'
          : form.category === 'platform'
            ? 'platform'
            : 'connector',
      tags,
      toolTypeId: selectedToolTypeIds[0],
      toolTypeIds: selectedToolTypeIds,
      toolTypeLabels: selectedToolTypeLabels,
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
      logoUrl: resolvePersistedToolLogoUrl({
        ...form,
        id,
        sourceType,
        marketShelf,
      }),
      // 内部工具无需额外审批；外部工具普通编辑不能顺带下架。
      published: autoPublishInternal || Boolean(prev?.published),
      marketShelf,
      marketTitle: marketShelf === 'external' ? marketTitle : undefined,
      businessScenarioIds: businessScenarioIds.length ? businessScenarioIds : undefined,
      featuredInFindCases: marketShelf === 'none' ? false : Boolean(form.featuredInFindCases),
      ...(sourceType === 'external' || marketShelf === 'external'
        ? {
            region: form.region as ToolRegion,
            cardSummary: form.cardSummary?.trim() || undefined,
            company: form.company?.trim() || undefined,
            productIntro: form.productIntro?.trim() || undefined,
            bestFor: form.bestFor?.trim() || undefined,
            coreCapabilities: form.coreCapabilities?.filter(Boolean),
            docsUrl: form.docsUrl?.trim() || undefined,
            mediaUrl: form.mediaUrl?.trim() || undefined,
            screenshotUrl: form.screenshotUrl?.trim() || undefined,
          }
        : {
            region: undefined,
            cardSummary: undefined,
            company: undefined,
          }),
    };

    setSaveError(null);
    setSaving(true);
    try {
      const result = await saveToolNow(nextTool, isNew);
      if (!result.synced) {
        const message =
          result.reason === 'offline'
            ? '共享服务未连接，工具尚未保存。请恢复后重试。'
            : `工具保存失败${result.detail ? `（${result.detail}）` : ''}，请稍后重试。`;
        setSaveError(message);
        showToast(message);
        return;
      }

      if (needsApproval) {
        const approvalStore = useAssetApprovalStore.getState();
        const hasPendingApproval = approvalStore.history.some(
          (record) =>
            record.kind === 'tool' && record.assetId === id && record.status === 'pending',
        );
        if (hasPendingApproval) {
          showToast('工具已保存并同步，已有上架审批待处理');
        } else {
          approvalStore.openApproval({
            kind: 'tool',
            assetId: id,
            assetName: name,
          });
          showToast('工具已保存并同步，已进入上架审批');
        }
      } else {
        showToast(
          nextTool.published
            ? '工具已保存并同步到共享服务'
            : '工具已保存为未上架并同步到共享服务',
        );
      }
      onClose();
    } catch (error) {
      const message = `工具保存失败${error instanceof Error && error.message ? `（${error.message}）` : ''}，请稍后重试。`;
      setSaveError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  };

  const guardedClose = () => {
    if (!saving) onClose();
  };
  const willSubmitApproval = Boolean(form.published) && !Boolean(existingTool?.published);
  const saveButtonLabel = willSubmitApproval
    ? '保存并提交审批'
    : form.published || autoPublishInternal
      ? '保存'
      : '保存为未上架';

  return (
    <CenterModal
      open
      title={title}
      onClose={guardedClose}
      actions={
        <>
          <button
            type="button"
            onClick={guardedClose}
            disabled={saving}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? '保存中…' : saveButtonLabel}
          </button>
        </>
      }
    >
      <fieldset disabled={saving} className="min-w-0 space-y-3 text-left disabled:opacity-75">
        {saveError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700"
          >
            {saveError}
          </div>
        ) : null}
        {isNew ? (
          <FormField
            label="上架货架"
            hint="决定这条数据进入哪个业务货架；不同货架需要填写的字段不同"
          >
            <FormSelect
              value={shelf}
              onChange={(e) => {
                const next = e.target.value as MarketShelfSlot;
                setForm({
                  ...form,
                  marketShelf: next,
                  sourceType: next === 'external' ? 'external' : 'internal',
                  category:
                    next === 'external' ? 'external' : next === 'internal' ? 'platform' : 'connector',
                  icon:
                    next === 'external' ? 'fa-arrow-up-right-from-square' : form.icon || 'fa-plug',
                  connectorType: next === 'none' ? form.connectorType || 'http' : undefined,
                  visibility: next === 'external' ? form.visibility : form.visibility ?? 'public',
                });
              }}
            >
              <option value="external">外部工具精选</option>
              <option value="internal">内部办公推荐</option>
            </FormSelect>
          </FormField>
        ) : null}
        <FormField label="工具名称（产品名）">
          <FormInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入工具的正式产品名称"
          />
        </FormField>
        {form.sourceType !== 'external' && shelf !== 'external' ? (
          <FormField label="描述">
            <FormTextarea
              rows={2}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="请简要说明工具用途"
            />
          </FormField>
        ) : null}
        {(form.sourceType === 'external' || shelf === 'external') && (
          <>
            <FormField label="目录区域（海外 / 国内）" hint="决定外精选双栏与筛选统计">
              <FormSelect
                value={form.region ?? ''}
                onChange={(e) =>
                  setForm({ ...form, region: (e.target.value || undefined) as ToolRegion | undefined })
                }
              >
                <option value="" disabled>请选择目录区域</option>
                <option value="overseas">海外</option>
                <option value="domestic">国内</option>
              </FormSelect>
            </FormField>
            <FormField label="卡片简介（核心作用）" hint="用于外部工具货架卡片的一句话简介">
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
            <FormField label="产品详细介绍" hint="对应工具详情页“产品详细介绍”">
              <FormTextarea
                rows={3}
                value={form.productIntro ?? ''}
                onChange={(e) => setForm({ ...form, productIntro: e.target.value })}
                placeholder="介绍产品定位、主要能力、适用任务及差异化特点"
              />
            </FormField>
            <FormField label="最适合" hint="对应工具详情页“最适合”">
              <FormInput
                value={form.bestFor ?? ''}
                onChange={(e) => setForm({ ...form, bestFor: e.target.value })}
                placeholder="例：需要可追溯来源的研究问答"
              />
            </FormField>
            <FormField label="核心能力" hint="对应工具详情页能力标签，使用逗号分隔">
              <FormInput
                value={(form.coreCapabilities ?? []).join('，')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    coreCapabilities: e.target.value
                      .split(/[,，]/)
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：深度研究，文件分析，多模态理解"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="帮助文档 URL">
                <FormInput
                  value={form.docsUrl ?? ''}
                  onChange={(e) => setForm({ ...form, docsUrl: e.target.value })}
                  placeholder="https://… 官方帮助文档"
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
                ? '内部办公推荐统一使用华为 Logo，无需单独上传。'
                : '可从 LobeHub AI 图标库选择或上传文件；不配置则按官网地址自动取 favicon。'
            }
          >
            <div className="flex items-center gap-3">
              {form.logoUrl || form.homepageUrl ? (
                <div className="shrink-0" aria-label="Logo 预览">
                  <ToolLogo
                    name={form.name || '工具'}
                    logoUrl={resolveToolLogoUrl(form)}
                    icon={form.icon}
                    size={40}
                    className="rounded-xl"
                  />
                </div>
              ) : null}
              {shelf === 'internal' || form.marketShelf === 'internal' ? (
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  已绑定华为品牌标识，与货架展示一致。
                </p>
              ) : (
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <FormSelect
                      aria-label="LobeHub 品牌 Logo"
                      value={selectedLobeIconId}
                      onChange={(e) => {
                        const icon = LOBE_ICON_OPTIONS.find((item) => item.id === e.target.value);
                        if (!icon) return;
                        setForm((current) => ({ ...current, logoUrl: lobeIconLogoUrl(icon) }));
                      }}
                      className="mt-0 min-w-0 flex-1"
                    >
                      <option value="" disabled>
                        从 300+ AI 品牌中选择…
                      </option>
                      {LOBE_ICON_GROUP_ORDER.map((group) => (
                        <optgroup key={group} label={LOBE_ICON_GROUP_LABEL[group]}>
                          {LOBE_ICON_OPTIONS.filter((icon) => icon.group === group).map((icon) => (
                            <option key={icon.id} value={icon.id}>
                              {icon.fullTitle}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </FormSelect>
                    <a
                      href="https://lobehub.com/icons"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 shrink-0 items-center rounded-xl border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      浏览图标库
                    </a>
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    图标来自 @lobehub/icons，选择后会保存国内 CDN 的 SVG 地址；也可在下方上传
                    PNG / JPEG / WebP / SVG / ICO 覆盖。
                  </p>
                  <input
                    type="file"
                    aria-label="上传品牌 Logo 文件"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                    className="block w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void readLogoFile(file)
                        .then((dataUrl) => {
                          setForm((current) => ({ ...current, logoUrl: dataUrl }));
                          showToast('Logo 已上传');
                        })
                        .catch((err: Error) => showToast(err.message || '上传失败'));
                    }}
                  />
                  {form.logoUrl ? (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                      onClick={() =>
                        setForm((current) => ({ ...current, logoUrl: undefined }))
                      }
                    >
                      清除自定义 Logo，改用官网 favicon
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </FormField>
        )}
        <ToolTypeMultiSelect
          key={String(target)}
          catalog={toolTypeCatalog}
          value={resolveExternalToolTypeSelection(form)}
          onChange={(next) =>
            setForm((current) => ({
              ...current,
              toolTypeId: next[0],
              toolTypeIds: next,
              toolTypeLabels: externalToolTypeSelectionLabels(next, toolTypeCatalog),
            }))
          }
        />
        <FormField
          label="其他检索标签（逗号分隔）"
          hint="保留 hw-internal、ai-saas、对话等运营标签；不用于上方用户页分类筛选"
        >
          <FormInput
            aria-label="其他检索标签"
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
          visibility={form.visibility as AssetVisibility | undefined}
          homepageUrl={form.homepageUrl}
          alwaysShowHomepage={shelf === 'internal'}
          lockSource={target === 'new-external'}
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

        {existingTool?.published ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5">
            <i className="fa-solid fa-circle-check mt-0.5 text-[13px] text-emerald-600" />
            <span>
              <span className="block text-[13px] font-medium text-emerald-800">当前已上架</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-emerald-700/75">
                编辑保存不会改变上架状态。
              </span>
            </span>
          </div>
        ) : null}
      </fieldset>
    </CenterModal>
  );
}

export type { EditorTarget as ToolEditorTarget };
