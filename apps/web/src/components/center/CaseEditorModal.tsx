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
import { CaseDocumentPreview } from '@/components/content/CaseDocumentPreview';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  PORTAL_OPS_TYPE_OPTIONS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import {
  CASE_PREVIEW_ACCEPT,
  CASE_PREVIEW_MAX_MB,
  formatFileSize,
  previewKindIcon,
  previewKindLabel,
  readCasePreviewFile,
} from '@/domain/casePreview';
import {
  inferBusinessScenarioFromTags,
  listVisibleBusinessScenarioCategories,
  scenarioTagsForBusiness,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { cn } from '@/lib/utils';

type EditorTarget = string | 'new' | null;

function emptyItem(): PortalContentItem {
  const today = new Date().toISOString().slice(0, 10);
  const name = getCurrentUserName() || 'MSS';
  return {
    id: '',
    type: 'case',
    title: '',
    desc: '',
    icon: 'fa-lightbulb',
    ownerDeptIds: [],
    ownerRegionId: null,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    visibility: 'public',
    publishedAt: today,
    scenarioTags: [],
    published: true,
    painPoint: '',
    impactMetric: '',
    steps: [],
    isGold: false,
    packageVersion: '1.0.0',
    previewFile: null,
    homepageUrl: '',
  };
}

function normalizeForm(item: PortalContentItem): PortalContentItem {
  const type =
    item.type === 'insight' || item.type === 'playbook' ? 'news' : item.type;
  return {
    ...emptyItem(),
    ...item,
    type,
    ownerDeptIds: Array.isArray(item.ownerDeptIds) ? item.ownerDeptIds : [],
    scenarioTags: Array.isArray(item.scenarioTags) ? item.scenarioTags : [],
    steps: Array.isArray(item.steps) ? item.steps : [],
    previewFile: item.previewFile ?? null,
    homepageUrl: item.homepageUrl ?? '',
  };
}

function hasAdvancedFields(item: PortalContentItem): boolean {
  return Boolean(
    item.painPoint ||
      item.impactMetric ||
      (item.steps && item.steps.length > 0) ||
      item.primarySkillId ||
      item.skillId ||
      item.agentId ||
      item.toolId ||
      item.kbDocId ||
      item.isGold ||
      (item.type !== 'case' && item.type !== 'insight' && item.type !== 'playbook'),
  );
}

interface CaseEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
  onSaved?: (item: PortalContentItem) => void;
  defaultType?: PortalContentItem['type'];
  defaultScenarioTags?: string[];
  /** 业务提报默认选中的业务场景篮子 */
  defaultBusinessId?: BusinessScenarioId;
  /**
   * ops：门户运营直接保存/上架
   * submit：业务用户提报 → 草稿 + 同一审批流
   */
  variant?: 'ops' | 'submit';
}

export function CaseEditorModal({
  target,
  onClose,
  onSaved,
  defaultType = 'case',
  defaultScenarioTags,
  defaultBusinessId,
  variant = 'ops',
}: CaseEditorModalProps) {
  const items = usePortalContentStore((s) => s.items);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);
  const showToast = usePortalContentStore((s) => s.showToast);
  const [form, setForm] = useState<PortalContentItem>(emptyItem());
  const [businessId, setBusinessId] = useState<BusinessScenarioId>('S1');
  const [uploading, setUploading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isSubmit = variant === 'submit';

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      const t =
        defaultType === 'insight' || defaultType === 'playbook' ? 'news' : defaultType;
      const biz =
        defaultBusinessId ??
        inferBusinessScenarioFromTags(defaultScenarioTags) ??
        'S1';
      const tags =
        defaultScenarioTags?.length
          ? [...defaultScenarioTags]
          : scenarioTagsForBusiness(biz);
      setForm({
        ...emptyItem(),
        type: isSubmit ? 'case' : t,
        scenarioTags: tags,
        published: isSubmit ? false : true,
        visibility: isSubmit ? 'org' : 'public',
      });
      setBusinessId(biz);
      setAdvancedOpen(false);
      return;
    }
    const existing = items.find((i) => i.id === target);
    const normalized = existing ? normalizeForm(existing) : emptyItem();
    setForm(normalized);
    setBusinessId(inferBusinessScenarioFromTags(normalized.scenarioTags) ?? 'S1');
    setAdvancedOpen(!isSubmit && hasAdvancedFields(normalized));
  }, [
    target,
    items,
    defaultType,
    defaultScenarioTags,
    defaultBusinessId,
    isSubmit,
  ]);

  if (!target) return null;

  const isNew = target === 'new';

  const applyBusiness = (biz: BusinessScenarioId) => {
    setBusinessId(biz);
    setForm((prev) => ({
      ...prev,
      scenarioTags: scenarioTagsForBusiness(biz),
    }));
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const previewFile = await readCasePreviewFile(file);
      setForm((prev) => ({
        ...prev,
        previewFile,
        icon:
          prev.icon === 'fa-lightbulb' || !prev.icon
            ? previewKindIcon(previewFile.kind)
            : prev.icon,
      }));
      showToast(`已上传预览文件：${previewFile.name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const title = form.title.trim();
    if (!title) {
      showToast('请填写标题');
      return;
    }
    const link = (form.homepageUrl ?? '').trim();
    const hasMaterial = Boolean(form.previewFile?.dataUrl) || Boolean(link && link !== '#');
    if (!hasMaterial) {
      showToast('请上传预览附件，或填写文档/演示链接（画廊需要材料才能展示）');
      return;
    }
    const tags =
      form.scenarioTags?.length
        ? form.scenarioTags
        : scenarioTagsForBusiness(businessId);
    if (!tags.length) {
      showToast('请选择业务场景');
      return;
    }

    const type =
      form.type === 'insight' || form.type === 'playbook' ? 'news' : form.type;
    const id = isNew
      ? isSubmit
        ? `portal-submit-${Date.now()}`
        : `portal-ops-${Date.now()}`
      : (target as string);
    const saved: PortalContentItem = {
      ...form,
      id,
      type: isSubmit ? 'case' : type,
      title,
      desc: form.desc.trim(),
      homepageUrl: link || undefined,
      scenarioTags: tags,
      painPoint: form.painPoint?.trim() || undefined,
      impactMetric: form.impactMetric?.trim() || undefined,
      steps: (form.steps ?? []).map((s) => s.trim()).filter(Boolean),
      publishedAt: form.publishedAt || new Date().toISOString().slice(0, 10),
      ownerDeptIds: (form.ownerDeptIds ?? []) as DeptId[],
      ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
      visibility: (form.visibility ?? (isSubmit ? 'org' : 'public')) as AssetVisibility,
      published: isSubmit ? false : form.published !== false,
      skillId: form.skillId || form.primarySkillId,
      primarySkillId: form.primarySkillId || form.skillId,
      previewFile: form.previewFile ?? null,
    };
    upsertItem(saved, isNew);
    onSaved?.(saved);
    onClose();

    if (isSubmit) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'portal',
        assetId: id,
        assetName: title,
        reasons: ['publish_executable'],
      });
      showToast('案例已提报，进入上架审批');
      return;
    }
    showToast(saved.published !== false ? '已保存并上架到场景案例' : '已保存为草稿');
  };

  return (
    <CenterModal
      open={!!target}
      title={
        isSubmit ? '提报场景案例' : isNew ? '配置场景案例材料' : '编辑场景案例材料'
      }
      onClose={onClose}
      size="lg"
      elevate
      actions={
        <ModalActions
          onCancel={onClose}
          onSave={handleSave}
          saveLabel={isSubmit ? '提交审批' : undefined}
        />
      }
    >
      <div className="space-y-4 text-left">
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          {isSubmit
            ? '填写与货架画廊一致的材料信息：标题、业务场景、预览附件或文档链接。提交后进入「业务主管 → MSS 质量与运营」审批，通过后出现在对应场景案例画廊。'
            : '主区对齐业务侧「场景卡 → 文档画廊」：标题、业务场景、预览附件/链接与组织可见性。打样挂载与成效补充在进阶区按需填写。'}
        </p>

        <section className="space-y-3 rounded-xl border border-zinc-100 p-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-800">
            场景案例材料
            <span className="ml-2 font-normal text-zinc-400">
              画廊标题 / 场景 / 附件或链接
            </span>
          </h4>
          <FormField label="标题">
            <FormInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="画廊幻灯与 How to 条目标题"
            />
          </FormField>
          <FormField label="描述">
            <FormTextarea
              rows={2}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="一句话说明材料用途"
            />
          </FormField>
          <FormField
            label="业务场景"
            hint="写入对应场景 matchTags，材料才会出现在该场景的案例画廊。"
          >
            <FormSelect
              value={businessId}
              onChange={(e) => applyBusiness(e.target.value as BusinessScenarioId)}
            >
              {listVisibleBusinessScenarioCategories().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <h5 className="pt-1 text-[10px] font-semibold tracking-wide text-zinc-400">
            预览附件（PDF / PPT / Word / Excel / 图片 / 视频）
          </h5>
          {form.previewFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <i
                      className={cn(
                        'fa-solid text-[12px]',
                        previewKindIcon(form.previewFile.kind),
                      )}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-zinc-800">
                      {form.previewFile.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {previewKindLabel(form.previewFile.kind)} ·{' '}
                      {formatFileSize(form.previewFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, previewFile: null })}
                  className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                >
                  移除
                </button>
              </div>
              <CaseDocumentPreview file={form.previewFile} />
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-6 text-center transition hover:border-zinc-400 hover:bg-zinc-50">
              <i className="fa-solid fa-cloud-arrow-up mb-2 text-lg text-zinc-400" />
              <span className="text-[12px] font-medium text-zinc-700">
                {uploading ? '上传中…' : '点击上传预览文件'}
              </span>
              <span className="mt-1 text-[10px] text-zinc-400">
                支持 PDF / PPT / Word / Excel / 图片 / 视频，单文件 ≤{' '}
                {CASE_PREVIEW_MAX_MB}MB
              </span>
              <input
                type="file"
                accept={CASE_PREVIEW_ACCEPT}
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  void handleUpload(f);
                }}
              />
            </label>
          )}

          <FormField
            label="文档 / 演示链接"
            hint="无附件时可填外链；画廊将作为链接幻灯展示。"
          >
            <FormInput
              value={form.homepageUrl ?? ''}
              onChange={(e) => setForm({ ...form, homepageUrl: e.target.value })}
              placeholder="https://"
            />
          </FormField>
        </section>

        <section className="space-y-3 rounded-xl border border-zinc-100 p-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-800">
            组织可见性
          </h4>
          <OwnershipFormFields
            ownerDeptIds={form.ownerDeptIds ?? []}
            ownerRegionId={form.ownerRegionId ?? null}
            sourceType="internal"
            visibility={(form.visibility ?? (isSubmit ? 'org' : 'public')) as AssetVisibility}
            homepageUrl={form.homepageUrl}
            onChange={(patch) => {
              const { sourceType: _src, homepageUrl: _url, ...rest } = patch;
              void _src;
              void _url;
              setForm({
                ...form,
                ...rest,
                ownerDeptIds:
                  (patch.ownerDeptIds as DeptId[] | undefined) ?? form.ownerDeptIds,
                ownerRegionId:
                  patch.ownerRegionId !== undefined
                    ? (patch.ownerRegionId as RegionId | null)
                    : form.ownerRegionId,
                homepageUrl: form.homepageUrl,
              });
            }}
          />
          {isSubmit ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              提报将保存为草稿并进入审批；审批通过后出现在对应场景的案例画廊。
            </p>
          ) : null}
        </section>

        {!isSubmit ? (
          <section className="rounded-xl border border-zinc-100">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="text-[11px] font-semibold tracking-wide text-zinc-800">
                进阶
                <span className="ml-2 font-normal text-zinc-400">
                  类型 / 成效补充 / 打样挂载 / 上架
                </span>
              </span>
              <i
                className={cn(
                  'fa-solid fa-chevron-down text-[10px] text-zinc-400 transition',
                  advancedOpen && 'rotate-180',
                )}
              />
            </button>
            {advancedOpen ? (
              <div className="space-y-3 border-t border-zinc-100 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="类型">
                    <FormSelect
                      value={
                        form.type === 'insight' || form.type === 'playbook'
                          ? 'news'
                          : form.type
                      }
                      onChange={(e) => {
                        const next = e.target.value as PortalContentItem['type'];
                        setForm({
                          ...form,
                          type: next,
                          icon:
                            next === 'training'
                              ? 'fa-graduation-cap'
                              : next === 'news'
                                ? 'fa-newspaper'
                                : form.icon || 'fa-lightbulb',
                        });
                      }}
                    >
                      {PORTAL_OPS_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {PORTAL_CONTENT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                  <FormField label="发布日期">
                    <FormInput
                      type="date"
                      value={form.publishedAt}
                      onChange={(e) =>
                        setForm({ ...form, publishedAt: e.target.value })
                      }
                    />
                  </FormField>
                </div>
                <FormField label="发布人">
                  <FormInput
                    value={form.publisher ?? ''}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  />
                </FormField>
                <FormField label="业务痛点（可选）">
                  <FormTextarea
                    rows={2}
                    value={form.painPoint ?? ''}
                    onChange={(e) => setForm({ ...form, painPoint: e.target.value })}
                    placeholder="补充说明，写入 How to / 导出包"
                  />
                </FormField>
                <FormField label="成效指标（可选）">
                  <FormInput
                    value={form.impactMetric ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, impactMetric: e.target.value })
                    }
                    placeholder="如：闭环 2 天 → 4 小时"
                  />
                </FormField>
                <FormField label="步骤（每行一步，可选）">
                  <FormTextarea
                    rows={3}
                    value={(form.steps ?? []).join('\n')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steps: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </FormField>
                <FormField
                  label="场景标签（高级补标签）"
                  hint="默认由业务场景写入；可追加自定义标签。"
                >
                  <FormInput
                    value={(form.scenarioTags ?? []).join(', ')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scenarioTags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="价格监测, offer"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="金牌 Skill ID">
                    <FormInput
                      value={form.primarySkillId ?? form.skillId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value || undefined;
                        setForm({ ...form, primarySkillId: v, skillId: v });
                      }}
                      placeholder="skill-price-monitor"
                    />
                  </FormField>
                  <FormField label="专家 Agent ID">
                    <FormInput
                      value={form.agentId ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, agentId: e.target.value || undefined })
                      }
                      placeholder="agent-price-monitor"
                    />
                  </FormField>
                  <FormField label="Tool ID">
                    <FormInput
                      value={form.toolId ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, toolId: e.target.value || undefined })
                      }
                      placeholder="tool-ext-latam-price"
                    />
                  </FormField>
                  <FormField label="知识库文档 ID">
                    <FormInput
                      value={form.kbDocId ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, kbDocId: e.target.value || undefined })
                      }
                      placeholder="kb-offer-monitor"
                    />
                  </FormField>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-claw-600"
                    checked={Boolean(form.isGold)}
                    onChange={(e) => setForm({ ...form, isGold: e.target.checked })}
                  />
                  <span className="text-[13px]">标记为金案例（排序优先）</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-claw-600"
                    checked={form.published !== false}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                  />
                  <span className="text-[13px]">上架到 MSS 场景案例货架</span>
                </label>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as CaseEditorTarget };
