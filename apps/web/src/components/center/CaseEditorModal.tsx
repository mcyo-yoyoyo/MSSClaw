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
import { usePortalContentStore } from '@/stores/portalContentStore';
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
    steps: ['打开本案例', '调用关联金牌 Skill / Agent', '确认交付物并同步 Owner'],
    isGold: false,
    packageVersion: '1.0.0',
    previewFile: null,
  };
}

function normalizeForm(item: PortalContentItem): PortalContentItem {
  const type = item.type === 'insight' ? 'news' : item.type;
  return {
    ...emptyItem(),
    ...item,
    type,
    ownerDeptIds: Array.isArray(item.ownerDeptIds) ? item.ownerDeptIds : [],
    scenarioTags: Array.isArray(item.scenarioTags) ? item.scenarioTags : [],
    steps: Array.isArray(item.steps) ? item.steps : [],
    previewFile: item.previewFile ?? null,
  };
}

interface CaseEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
  onSaved?: (item: PortalContentItem) => void;
  defaultType?: PortalContentItem['type'];
}

export function CaseEditorModal({
  target,
  onClose,
  onSaved,
  defaultType = 'case',
}: CaseEditorModalProps) {
  const items = usePortalContentStore((s) => s.items);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);
  const showToast = usePortalContentStore((s) => s.showToast);
  const [form, setForm] = useState<PortalContentItem>(emptyItem());
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      const t = defaultType === 'insight' ? 'news' : defaultType;
      setForm({ ...emptyItem(), type: t });
      return;
    }
    const existing = items.find((i) => i.id === target);
    setForm(existing ? normalizeForm(existing) : emptyItem());
  }, [target, items, defaultType]);

  if (!target) return null;

  const isNew = target === 'new';

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
    const type = form.type === 'insight' ? 'news' : form.type;
    const saved: PortalContentItem = {
      ...form,
      id: isNew ? `portal-ops-${Date.now()}` : (target as string),
      type,
      title,
      desc: form.desc.trim(),
      painPoint: form.painPoint?.trim() || undefined,
      impactMetric: form.impactMetric?.trim() || undefined,
      steps: (form.steps ?? []).map((s) => s.trim()).filter(Boolean),
      publishedAt: form.publishedAt || new Date().toISOString().slice(0, 10),
      ownerDeptIds: (form.ownerDeptIds ?? []) as DeptId[],
      ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
      visibility: (form.visibility ?? 'public') as AssetVisibility,
      published: form.published !== false,
      skillId: form.skillId || form.primarySkillId,
      primarySkillId: form.primarySkillId || form.skillId,
      previewFile: form.previewFile ?? null,
    };
    upsertItem(saved, isNew);
    showToast(saved.published !== false ? '已保存并上架到样板间' : '已保存为草稿');
    onSaved?.(saved);
    onClose();
  };

  return (
    <CenterModal
      open={!!target}
      title={isNew ? '新建门户内容' : '编辑门户内容'}
      onClose={onClose}
      size="lg"
      elevate
      actions={<ModalActions onCancel={onClose} onSave={handleSave} />}
    >
      <div className="space-y-4 text-left">
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          以下字段与「案例 · 样板间」成效卡一一对应：标题 / 描述 / 痛点 / 成效指标 / 打样步骤 /
          标签与金牌能力 / 适用组织 / 预览附件。
        </p>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400">成效卡 · 基础</h4>
          <FormField label="标题（成效卡标题）">
            <FormInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </FormField>
          <FormField label="描述（成效卡摘要）">
            <FormTextarea
              rows={2}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="类型">
              <FormSelect
                value={form.type === 'insight' ? 'news' : form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as PortalContentItem['type'] })
                }
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
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="发布人（成效卡署名）">
            <FormInput
              value={form.publisher ?? ''}
              onChange={(e) => setForm({ ...form, publisher: e.target.value })}
            />
          </FormField>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400">成效卡 · 痛点与指标</h4>
          <FormField label="业务痛点">
            <FormTextarea
              rows={2}
              value={form.painPoint ?? ''}
              onChange={(e) => setForm({ ...form, painPoint: e.target.value })}
              placeholder="上架前业务痛点一句话"
            />
          </FormField>
          <FormField label="成效指标">
            <FormInput
              value={form.impactMetric ?? ''}
              onChange={(e) => setForm({ ...form, impactMetric: e.target.value })}
              placeholder="如：闭环 2 天 → 4 小时"
            />
          </FormField>
          <FormField label="打样三步走（每行一步，建议 3 步）">
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
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400">成效卡 · 能力与标签</h4>
          <FormField label="场景标签（逗号分隔，对应样板间 #标签）">
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
            <FormField label="金牌 Skill ID（立即打样优先）">
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
                onChange={(e) => setForm({ ...form, agentId: e.target.value || undefined })}
                placeholder="agent-price-monitor"
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
            <span className="text-[13px]">标记为金案例（样板间显示「金」角标）</span>
          </label>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400">
            在线预览附件（PPT / PDF / Word / Excel）
          </h4>
          {form.previewFile ? (
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
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-6 text-center transition hover:border-zinc-400 hover:bg-zinc-50">
              <i className="fa-solid fa-cloud-arrow-up mb-2 text-lg text-zinc-400" />
              <span className="text-[12px] font-medium text-zinc-700">
                {uploading ? '上传中…' : '点击上传预览文件'}
              </span>
              <span className="mt-1 text-[10px] text-zinc-400">
                支持 PDF / PPT / Word / Excel / 图片，单文件 ≤ {CASE_PREVIEW_MAX_MB}MB
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
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400">
            适用组织（成效卡「适用」行）
          </h4>
          <OwnershipFormFields
            ownerDeptIds={form.ownerDeptIds ?? []}
            ownerRegionId={form.ownerRegionId ?? null}
            sourceType="internal"
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
              checked={form.published !== false}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            <span className="text-[13px]">上架到案例样板间 / 首页橱窗</span>
          </label>
        </section>
      </div>
    </CenterModal>
  );
}
