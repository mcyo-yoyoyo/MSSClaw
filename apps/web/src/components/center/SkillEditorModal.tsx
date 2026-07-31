import { useEffect, useRef, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/center/CenterFormFields';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { ASSET_VISIBILITY_LABELS, HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import { DEFAULT_SKILL_ACCENT, SKILL_ACCENT_PRESETS } from '@/domain/skillAccent';
import { cn } from '@/lib/utils';
import {
  BUSINESS_SCENARIO_CATEGORIES,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { DO_TASK_FEATURED_HINT } from '@/domain/capabilityShelf';
import { resolveSkillBusinessScenario, resolveSkillFeaturedInDoTask } from '@/domain/skillBusinessScenarios';
import {
  getCurrentDeptIds,
  getCurrentPlatformRole,
  getCurrentRegionId,
  getCurrentUserId,
  getCurrentUserName,
  isSystemAdmin,
} from '@/domain/currentUser';
import { getVisibleHomeDepts, getVisibleHomeRegions } from '@/domain/rolePerspective';
import { parseSkillUpload } from '@/domain/skillExport';
import { suggestSkillSearchKeywords } from '@/domain/skillKeywords';
import { skillDisplayName, syncSkillZhPrimary } from '@/domain/skillDisplay';
import type { AssetApprovalReason } from '@/domain/assetApproval';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';

type EditorTarget = string | 'new' | null;
type WizardStep = 0 | 1 | 2 | 3;

function emptySkill(): PrototypeSkillSeed {
  const name = getCurrentUserName() || 'Mcyo';
  return {
    id: '',
    name: '',
    desc: '',
    nameZh: '',
    nameEn: '',
    descZh: '',
    descEn: '',
    category: 'office',
    command: '',
    author: name,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    version: '1.0.0',
    connector: '',
    published: false,
    invokes: 0,
    icon: 'fa-cube',
    accentColor: DEFAULT_SKILL_ACCENT,
    tags: [],
    searchKeywords: [],
    instructions: '',
    planSteps: [],
    sourceType: 'internal',
    visibility: 'org',
    ownerDeptIds: [...getCurrentDeptIds()],
    ownerRegionId: getCurrentRegionId(),
    homepageUrl: '',
  };
}

function normalizeSkillForm(skill: PrototypeSkillSeed): PrototypeSkillSeed {
  const base = { ...emptySkill(), ...skill };
  return {
    ...base,
    nameZh: skill.nameZh || skill.name || '',
    nameEn: skill.nameEn || '',
    descZh: skill.descZh || skill.desc || '',
    descEn: skill.descEn || '',
    tags: Array.isArray(skill.tags) ? skill.tags : [],
    searchKeywords: Array.isArray(skill.searchKeywords) ? skill.searchKeywords : [],
    instructions: skill.instructions ?? '',
    planSteps: Array.isArray(skill.planSteps) ? skill.planSteps : [],
    ownerDeptIds: Array.isArray(skill.ownerDeptIds) ? skill.ownerDeptIds : [...getCurrentDeptIds()],
    ownerRegionId: skill.ownerRegionId ?? getCurrentRegionId(),
    visibility: skill.visibility ?? 'org',
    published: Boolean(skill.published),
    featuredInDoTask: resolveSkillFeaturedInDoTask(skill),
    businessScenarioId: resolveSkillBusinessScenario(skill) ?? undefined,
    accentColor: skill.accentColor || DEFAULT_SKILL_ACCENT,
  };
}

const STEPS = [
  { id: 0 as const, label: '上传解析' },
  { id: 1 as const, label: '身份信息' },
  { id: 2 as const, label: '范围标签' },
  { id: 3 as const, label: '门禁发布' },
];

interface SkillEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function SkillEditorModal({ target, onClose }: SkillEditorModalProps) {
  const { skills, upsertSkill, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeSkillSeed>(emptySkill());
  const [step, setStep] = useState<WizardStep>(0);
  const [wantPublish, setWantPublish] = useState(false);
  const [wantPublic, setWantPublic] = useState(false);
  const [packName, setPackName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew = target === 'new';
  const platformRole = getCurrentPlatformRole();
  const isPlatformOps = isSystemAdmin(platformRole);
  const selectableDepts = getVisibleHomeDepts(
    { deptIds: getCurrentDeptIds(), regionId: getCurrentRegionId() },
    platformRole,
  );
  const selectableRegions = getVisibleHomeRegions(
    { deptIds: getCurrentDeptIds(), regionId: getCurrentRegionId() },
    platformRole,
  );

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setForm(emptySkill());
      setStep(0);
      setWantPublish(false);
      setWantPublic(false);
      setPackName(null);
      setShowAdvanced(false);
      return;
    }
    const existing = skills.find((s) => s.id === target);
    const normalized = existing ? normalizeSkillForm(existing) : emptySkill();
    setForm(normalized);
    setStep(1);
    setWantPublish(Boolean(normalized.published));
    setWantPublic(normalized.visibility === 'public');
    setPackName(null);
    setShowAdvanced(false);
  }, [target, skills]);

  if (!target) return null;

  const applyParsed = (parsed: PrototypeSkillSeed, fileLabel: string) => {
    const merged = normalizeSkillForm({
      ...emptySkill(),
      ...parsed,
      id: '',
      published: false,
      visibility: 'org',
      ownerDeptIds: form.ownerDeptIds?.length ? form.ownerDeptIds : [...getCurrentDeptIds()],
      ownerRegionId: form.ownerRegionId ?? getCurrentRegionId(),
      publisher: getCurrentUserName() || parsed.publisher,
      publisherUserId: getCurrentUserId() || undefined,
    });
    const keywords = suggestSkillSearchKeywords({
      nameZh: merged.nameZh,
      nameEn: merged.nameEn,
      descZh: merged.descZh,
      descEn: merged.descEn,
      instructions: merged.instructions,
      command: merged.command,
      existingTags: merged.tags,
    });
    setForm({ ...merged, searchKeywords: keywords });
    setPackName(fileLabel);
    setWantPublish(false);
    setWantPublic(false);
    setStep(1);
    showToast(`已解析 Skill 包「${fileLabel}」，请确认信息与范围`);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setParsing(true);
    try {
      const items = await parseSkillUpload(file);
      if (!items[0]) {
        showToast('未能识别标准 Skill 包（支持 .skill.zip / SKILL.md / JSON）');
        return;
      }
      applyParsed(items[0], file.name);
    } catch {
      showToast('Skill 包解析失败，请检查格式');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const refreshKeywords = () => {
    const keywords = suggestSkillSearchKeywords({
      nameZh: form.nameZh,
      nameEn: form.nameEn,
      descZh: form.descZh,
      descEn: form.descEn,
      instructions: form.instructions,
      command: form.command,
      existingTags: form.tags,
    });
    setForm({ ...form, searchKeywords: keywords });
    showToast('已根据名称与正文生成搜索关键词');
  };

  const validateStep = (s: WizardStep): boolean => {
    if (s === 1) {
      const zh = (form.nameZh || form.name || '').trim();
      if (!zh) {
        showToast('请填写中文名称');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!(form.ownerDeptIds?.length || form.ownerRegionId)) {
        showToast('请至少选择所属职能或区域（默认组织内可见）');
        return false;
      }
      if (!isPlatformOps) {
        const depts = form.ownerDeptIds ?? [];
        if (depts.some((d) => !selectableDepts.includes(d))) {
          showToast('能力开发仅能归属本人组织职能，不可跨部门创建');
          return false;
        }
        if (form.ownerRegionId && !selectableRegions.includes(form.ownerRegionId)) {
          showToast('能力开发仅能归属本人组织区域');
          return false;
        }
      }
      return true;
    }
    if (s === 3 && form.featuredInDoTask && !form.businessScenarioId) {
      showToast('精选露出到做任务时请选择业务场景篮子');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 3) setStep((step + 1) as WizardStep);
  };

  const handleSave = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      if (!(form.nameZh || form.name || '').trim()) setStep(1);
      else setStep(2);
      return;
    }

    const prev = !isNew ? skills.find((s) => s.id === target) : null;
    const nameZh = (form.nameZh || form.name || '').trim();
    let cmd = form.command.trim() || `/${nameZh.toLowerCase().replace(/\s+/g, '-')}`;
    if (!cmd.startsWith('/')) cmd = `/${cmd}`;

    const reasons: AssetApprovalReason[] = [];
    if (wantPublish && !prev?.published) reasons.push('publish_executable');
    if (wantPublic && prev?.visibility !== 'public') reasons.push('visibility_public');
    // 新建且申请公开
    if (wantPublic && isNew) {
      if (!reasons.includes('visibility_public')) reasons.push('visibility_public');
    }

    const needsApproval = reasons.length > 0;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `skill-${Date.now()}` : (target as string);

    // 未审批前：不可调用；公开申请中仍落库为 org
    const visibility: AssetVisibility = wantPublic && !needsApproval
      ? 'public'
      : wantPublic && needsApproval
        ? 'org'
        : ((form.visibility === 'private' ? 'private' : 'org') as AssetVisibility);

    let draft = syncSkillZhPrimary({
      ...form,
      id,
      nameZh,
      nameEn: (form.nameEn || '').trim(),
      descZh: (form.descZh || form.desc || '').trim(),
      descEn: (form.descEn || '').trim(),
      category: 'office',
      command: cmd,
      version: form.version.trim() || '1.0.0',
      connector: '', // 1.0 不打通连接器
      tags: Array.isArray(form.tags) ? form.tags : [],
      searchKeywords: Array.isArray(form.searchKeywords) ? form.searchKeywords : [],
      instructions: form.instructions?.trim() || undefined,
      planSteps: (form.planSteps ?? []).map((s) => s.trim()).filter(Boolean),
      author: prev?.author ?? userName,
      publisher: form.publisher || userName,
      publisherUserId: form.publisherUserId || userId || undefined,
      invokes: prev?.invokes ?? 0,
      icon: prev?.icon ?? form.icon ?? 'fa-cube',
      accentColor: form.accentColor || DEFAULT_SKILL_ACCENT,
      sourceType: 'internal',
      visibility,
      ownerDeptIds: (form.ownerDeptIds ?? []) as DeptId[],
      ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
      homepageUrl: undefined,
      published: needsApproval ? false : wantPublish,
      featuredInDoTask: wantPublish ? form.featuredInDoTask : false,
    });

    if (!draft.searchKeywords?.length) {
      draft = {
        ...draft,
        searchKeywords: suggestSkillSearchKeywords({
          nameZh: draft.nameZh,
          nameEn: draft.nameEn,
          descZh: draft.descZh,
          descEn: draft.descEn,
          instructions: draft.instructions,
          command: draft.command,
          existingTags: draft.tags,
        }),
      };
    }

    upsertSkill(draft, isNew);
    onClose();

    if (needsApproval) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'skill',
        assetId: id,
        assetName: skillDisplayName(draft),
        reasons,
      });
      showToast('技能已保存为组织内草稿，审批通过后生效申请项');
    } else {
      showToast(wantPublish ? '技能已保存并上架可调用' : '技能已保存（组织内沉淀 · 未上架调用）');
    }
  };

  const stepHint =
    step === 0
      ? '优先上传标准 Skill 包，自动解析后再配置范围'
      : step === 1
        ? '中英文名称与描述；默认界面展示中文'
        : step === 2
          ? '默认组织内可见，沉淀部门资产；公开需审批'
          : '上架可调用默认关闭；开启即触发审批';

  return (
    <CenterModal
      open
      elevate
      size="lg"
      title={isNew ? '创建技能' : '编辑技能'}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-between gap-2">
          <p className="hidden text-[11px] text-zinc-500 sm:block">{stepHint}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-50"
            >
              取消
            </button>
            {step > (isNew ? 0 : 1) ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as WizardStep)}
                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50"
              >
                上一步
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0) {
                    showToast('请上传 Skill 包，或选择「空白创建」');
                    return;
                  }
                  goNext();
                }}
                className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-claw-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-claw-700"
              >
                保存
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* step tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STEPS.filter((s) => (isNew ? true : s.id !== 0)).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (!isNew && s.id === 0) return;
                if (s.id > 0 && s.id > step + 1) return;
                setStep(s.id);
              }}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                step === s.id
                  ? 'bg-claw-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {step === 0 && isNew ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <i className="fa-solid fa-file-zipper text-[18px] text-claw-600" />
              </div>
              <p className="text-[15px] font-semibold text-zinc-900">一键上传 Skill 包</p>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-zinc-500">
                支持业界常见 <code className="text-zinc-700">.skill.zip</code> /
                <code className="text-zinc-700"> SKILL.md</code> / 清单 JSON。自动解析名称、描述与正文。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,.skill.zip,.md,.skill.md,.json,application/zip"
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={parsing}
                onClick={() => fileRef.current?.click()}
                className="mt-4 rounded-xl bg-claw-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-claw-700 disabled:opacity-60"
              >
                {parsing ? '解析中…' : '选择文件并解析'}
              </button>
              {packName ? (
                <p className="mt-2 text-[11px] text-emerald-700">已载入：{packName}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(emptySkill());
                setPackName(null);
                setStep(1);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              不使用包 · 空白创建
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            {packName ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                来自包解析：{packName} · 可继续改写字段
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField label="中文名称（默认展示）">
                <FormInput
                  value={form.nameZh || ''}
                  onChange={(e) => setForm({ ...form, nameZh: e.target.value, name: e.target.value })}
                  placeholder="例如：电渠评论分析"
                />
              </FormField>
              <FormField label="English name">
                <FormInput
                  value={form.nameEn || ''}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder="e.g. Ecommerce Review Analysis"
                />
              </FormField>
            </div>
            <FormField label="中文描述（默认展示）">
              <FormTextarea
                rows={2}
                value={form.descZh || ''}
                onChange={(e) => setForm({ ...form, descZh: e.target.value, desc: e.target.value })}
              />
            </FormField>
            <FormField label="English description">
              <FormTextarea
                rows={2}
                value={form.descEn || ''}
                onChange={(e) => setForm({ ...form, descEn: e.target.value })}
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-[12px] text-zinc-600">
              创建人：
              <span className="font-semibold text-zinc-900">
                {form.author || getCurrentUserName() || '当前用户'}
              </span>
              <span className="mx-1.5 text-zinc-300">·</span>
              发布方：
              <span className="font-semibold text-zinc-900">
                {form.publisher || getCurrentUserName() || '当前用户'}
              </span>
            </div>
            <FormField label="标识色" hint="列表用色点区分，无需上传 Logo">
              <div className="flex flex-wrap gap-2">
                {SKILL_ACCENT_PRESETS.map((p) => {
                  const active = (form.accentColor || DEFAULT_SKILL_ACCENT) === p.color;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => setForm({ ...form, accentColor: p.color })}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 transition',
                        active ? 'border-zinc-900 scale-105' : 'border-transparent hover:border-zinc-300',
                      )}
                      style={{ backgroundColor: p.color }}
                    >
                      {active ? <i className="fa-solid fa-check text-[10px] text-white" /> : null}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField
              label="Skill 正文（对话执行时注入）"
              hint="标准化包中的 SKILL.md 正文会填到这里"
            >
              <FormTextarea
                rows={7}
                className="font-mono text-[12px] leading-relaxed"
                placeholder={'你是某某 Skill（/指令）。\n\n## 能力范围\n...\n\n## 必须输出\n...'}
                value={form.instructions ?? ''}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </FormField>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[12px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              {showAdvanced ? '收起高级项' : '展开高级项（执行计划）'}
            </button>
            {showAdvanced ? (
              <FormField label="执行计划步骤（每行一步）" hint="1.0 可选">
                <FormTextarea
                  rows={4}
                  className="font-mono text-[12px] leading-relaxed"
                  value={(form.planSteps ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      planSteps: e.target.value
                        .split('\n')
                        .map((s) => s.trimEnd())
                        .filter((s) => s.trim().length > 0),
                    })
                  }
                />
              </FormField>
            ) : null}
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
              1.0 不配置连接器：Skill 以正文与指令沉淀为主，连接器打通列入后续版本。
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField
                label="所属职能（可多选）"
                hint={
                  isPlatformOps
                    ? '平台运营可指定任意职能'
                    : '能力开发仅可归属本人组织职能'
                }
              >
                <select
                  multiple
                  className="min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-[13px]"
                  value={form.ownerDeptIds ?? []}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map((o) => o.value as DeptId);
                    setForm({ ...form, ownerDeptIds: vals });
                  }}
                >
                  {HQ_DEPTS.filter((d) => selectableDepts.includes(d.id)).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="所属区域"
                hint={
                  isPlatformOps
                    ? '平台运营可指定任意区域'
                    : '能力开发仅可归属本人组织区域'
                }
              >
                <FormSelect
                  value={form.ownerRegionId ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ownerRegionId: (e.target.value || null) as RegionId | null,
                    })
                  }
                >
                  <option value="">— 不限区域 —</option>
                  {REGIONS.filter((r) => selectableRegions.includes(r.id)).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>

            <FormField label="运营标签（逗号分隔）">
              <FormInput
                value={(form.tags ?? []).join(', ')}
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

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-zinc-800">搜索关键词（模型识别）</p>
                  <p className="text-[11px] text-zinc-500">1.0 本地识别名称与正文；可手动增删</p>
                </div>
                <button
                  type="button"
                  onClick={refreshKeywords}
                  className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  重新识别
                </button>
              </div>
              <FormInput
                value={(form.searchKeywords ?? []).join(', ')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    searchKeywords: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="点击「重新识别」或手动输入"
              />
            </div>

            <div className="rounded-xl border border-zinc-200 px-3 py-2.5 space-y-2">
              <p className="text-[13px] font-semibold text-zinc-800">可见范围</p>
              <p className="text-[11px] text-zinc-500">
                默认「本组织可见」，支撑部门 Skill 沉淀。改为公开（跨部门）将触发评审，避免货架杂乱。
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="vis"
                  className="accent-claw-600"
                  checked={!wantPublic && form.visibility !== 'private'}
                  onChange={() => {
                    setWantPublic(false);
                    setForm({ ...form, visibility: 'org' });
                  }}
                />
                <span className="text-[13px]">{ASSET_VISIBILITY_LABELS.org}（推荐）</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="vis"
                  className="accent-claw-600"
                  checked={form.visibility === 'private'}
                  onChange={() => {
                    setWantPublic(false);
                    setForm({ ...form, visibility: 'private' });
                  }}
                />
                <span className="text-[13px]">{ASSET_VISIBILITY_LABELS.private}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-claw-600"
                  checked={wantPublic}
                  onChange={(e) => {
                    setWantPublic(e.target.checked);
                    if (e.target.checked) setForm({ ...form, visibility: 'org' });
                  }}
                />
                <span>
                  <span className="block text-[13px] font-medium text-zinc-800">申请公开可见（跨部门）</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                    勾选后保存将进入审批；通过前仍保持组织内可见。
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 px-3 py-2.5 space-y-2">
              <p className="text-[13px] font-semibold text-zinc-800">上架可调用（执行模型任务）</p>
              <p className="text-[11px] text-zinc-500">
                默认关闭：Skill 仅作组织资产沉淀，不可被对话/任务调用。开启即表示可执行模型任务，需审批。
              </p>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-claw-600"
                  checked={wantPublish}
                  onChange={(e) => setWantPublish(e.target.checked)}
                />
                <span>
                  <span className="block text-[13px] font-medium text-zinc-800">申请上架可调用</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                    审批流：提交人 → 业务主管 → MSS 质量与运营
                  </span>
                </span>
              </label>
            </div>

            {wantPublish ? (
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 space-y-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-claw-600"
                    checked={Boolean(form.featuredInDoTask)}
                    onChange={(e) => setForm({ ...form, featuredInDoTask: e.target.checked })}
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-zinc-800">精选露出到「做任务」</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                      {DO_TASK_FEATURED_HINT}
                    </span>
                  </span>
                </label>
                {form.featuredInDoTask ? (
                  <FormField label="业务场景篮子">
                    <FormSelect
                      value={form.businessScenarioId ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          businessScenarioId: (e.target.value || undefined) as
                            | BusinessScenarioId
                            | undefined,
                        })
                      }
                    >
                      <option value="">— 请选择场景 —</option>
                      {BUSINESS_SCENARIO_CATEGORIES.filter((c) => c.tabVisible).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl bg-zinc-900 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-200">
              <p className="font-semibold text-white">保存后将生效</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>资产写入：组织内沉淀（草稿或已有范围）</li>
                {wantPublic ? <li>触发审批：公开可见</li> : <li>可见范围：组织内 / 仅发布方</li>}
                {wantPublish ? <li>触发审批：上架可调用</li> : <li>调用状态：不可执行模型任务</li>}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </CenterModal>
  );
}

export type { EditorTarget as SkillEditorTarget };
