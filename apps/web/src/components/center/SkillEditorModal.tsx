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
import { DEFAULT_SKILL_ACCENT } from '@/domain/skillAccent';
import { cn } from '@/lib/utils';
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { DO_TASK_FEATURED_HINT } from '@/domain/capabilityShelf';
import { uploadWorkspaceBlob } from '@/api/blobApi';
import { currentWorkspaceId } from '@/api/platformDocsApi';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
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
import { assertSkillScanAllowsApproval } from '@/domain/skillSecurityScan';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { shareSyncSaveHint } from '@/domain/shareSync';
import { SkillAvatar } from '@/components/brand/SkillAvatar';

const ICON_MAX_BYTES = 512 * 1024;

function readSkillIconFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > ICON_MAX_BYTES) {
      reject(new Error('头像请小于 512KB'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

type EditorTarget = string | 'new' | null;
type WizardStep = 0 | 1 | 2 | 3;

function emptySkill(): PrototypeSkillSeed {
  const name = getCurrentUserName() || 'Mcyo';
  const stamp = new Date().toISOString().slice(0, 10);
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
    usageNotes: '',
    cases: [],
    caseAttachments: [],
    envInfo: {
      dependencies: '',
      framework: '',
      runtimeVersion: '',
      hardwareNetwork: '',
    },
    createdAt: stamp,
    updatedAt: stamp,
    updatedBy: name,
    sourceType: 'internal',
    visibility: 'org',
    ownerDeptIds: getCurrentDeptIds().slice(0, 1),
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
    usageNotes: skill.usageNotes ?? '',
    cases: Array.isArray(skill.cases) ? skill.cases : [],
    caseAttachments: Array.isArray(skill.caseAttachments) ? skill.caseAttachments : [],
    envInfo: {
      dependencies: skill.envInfo?.dependencies ?? '',
      framework: skill.envInfo?.framework ?? '',
      runtimeVersion: skill.envInfo?.runtimeVersion ?? '',
      hardwareNetwork: skill.envInfo?.hardwareNetwork ?? '',
    },
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
    updatedBy: skill.updatedBy,
    ownerDeptIds: Array.isArray(skill.ownerDeptIds)
      ? skill.ownerDeptIds.slice(0, 1)
      : getCurrentDeptIds().slice(0, 1),
    ownerRegionId: skill.ownerRegionId ?? getCurrentRegionId(),
    visibility: skill.visibility === 'org' || skill.visibility === 'private' ? skill.visibility : 'public',
    published: Boolean(skill.published),
    featuredInDoTask: resolveSkillFeaturedInDoTask(skill),
    businessScenarioId: resolveSkillBusinessScenario(skill) ?? undefined,
    accentColor: skill.accentColor || DEFAULT_SKILL_ACCENT,
    iconUrl: skill.iconUrl,
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
  const [uploadingCase, setUploadingCase] = useState(false);
  const [step, setStep] = useState<WizardStep>(0);
  const [wantPublish, setWantPublish] = useState(false);
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
      setPackName(null);
      setShowAdvanced(false);
      return;
    }
    const existing = skills.find((s) => s.id === target);
    const normalized = existing ? normalizeSkillForm(existing) : emptySkill();
    setForm(normalized);
    setStep(1);
    setWantPublish(Boolean(normalized.published));
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
      ownerDeptIds: form.ownerDeptIds?.length
        ? form.ownerDeptIds.slice(0, 1)
        : getCurrentDeptIds().slice(0, 1),
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
      if (!form.businessScenarioId) {
        showToast('请选择业务场景分类');
        return false;
      }
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
    if (form.visibility === 'public' && prev?.visibility !== 'public') reasons.push('visibility_public');
    // 已上架后取消勾选：走下架审批，不可直接下架
    if (prev?.published && !wantPublish) reasons.push('unpublish_skill');

    if (reasons.includes('publish_executable') || reasons.includes('update_version')) {
      const gate = assertSkillScanAllowsApproval(form.securityScan ?? prev?.securityScan);
      if (!gate.ok) {
        showToast(gate.message || '安全扫描未通过，无法发起上架审批');
        return;
      }
      if (gate.message) showToast(gate.message);
    }

    const needsApproval = reasons.length > 0;
    const userName = getCurrentUserName() || 'Mcyo';
    const userId = getCurrentUserId();
    const id = isNew ? `skill-${Date.now()}` : (target as string);
    const stamp = new Date().toISOString().slice(0, 10);

    const visibility: AssetVisibility =
      form.visibility === 'org' || form.visibility === 'private' ? form.visibility : 'public';

    const envInfo = {
      dependencies: form.envInfo?.dependencies?.trim() || undefined,
      framework: form.envInfo?.framework?.trim() || undefined,
      runtimeVersion: form.envInfo?.runtimeVersion?.trim() || undefined,
      hardwareNetwork: form.envInfo?.hardwareNetwork?.trim() || undefined,
    };
    const hasEnv = Object.values(envInfo).some(Boolean);

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
      usageNotes: form.usageNotes?.trim() || undefined,
      cases: (form.cases ?? [])
        .map((c) => ({
          title: (c.title || '').trim(),
          input: c.input?.trim() || undefined,
          output: c.output?.trim() || undefined,
        }))
        .filter((c) => c.title),
      caseAttachments: (form.caseAttachments ?? []).length ? form.caseAttachments : undefined,
      envInfo: hasEnv ? envInfo : undefined,
      author: prev?.author ?? userName,
      publisher: form.publisher || userName,
      publisherUserId: form.publisherUserId || userId || undefined,
      invokes: prev?.invokes ?? 0,
      icon: prev?.icon ?? form.icon ?? 'fa-cube',
      iconUrl: form.iconUrl?.trim() || undefined,
      accentColor: form.accentColor || DEFAULT_SKILL_ACCENT,
      sourceType: 'internal',
      visibility,
      ownerDeptIds: ((form.ownerDeptIds ?? []).slice(0, 1) as DeptId[]),
      ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
      homepageUrl: undefined,
      // 下架审批中保持上架，直至终审通过
      published: reasons.includes('unpublish_skill')
        ? true
        : needsApproval
          ? false
          : wantPublish,
      featuredInDoTask: wantPublish ? form.featuredInDoTask : false,
      featuredInMssMarket: wantPublish ? form.featuredInDoTask : false,
      createdAt: prev?.createdAt || form.createdAt || stamp,
      updatedAt: stamp,
      updatedBy: userName,
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
        note: reasons.includes('unpublish_skill')
          ? '编辑器取消「上架可调用」，申请下架'
          : undefined,
        unpublishMode: reasons.includes('unpublish_skill') ? 'all' : undefined,
      });
      showToast(
        (reasons.includes('unpublish_skill')
          ? '已提交下架审批，通过前仍保持集市可见'
          : '技能已保存为组织内草稿，审批通过后生效申请项') + shareSyncSaveHint(),
      );
    } else {
      showToast(
        (wantPublish ? '技能已保存并上架可调用' : '技能已保存（组织内沉淀 · 未上架调用）') +
          shareSyncSaveHint(),
      );
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
      title={isNew ? '提报 Skill' : '编辑 Skill'}
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
            <FormField
              label="自定义头像"
              hint="上传 PNG/JPG/WebP（≤512KB）。以 data URL 保存，GitHub Pages 静态站也可预览。"
            >
              <div className="flex items-center gap-3">
                <SkillAvatar
                  skillId={form.id || 'new'}
                  icon={form.icon || 'fa-cube'}
                  iconUrl={form.iconUrl}
                  size={48}
                  title={form.nameZh || form.name || 'Skill'}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void readSkillIconFile(file)
                        .then((dataUrl) => {
                          setForm({ ...form, iconUrl: dataUrl });
                          useMarketplaceStore.getState().showToast('自定义头像已上传');
                        })
                        .catch((err: Error) =>
                          useMarketplaceStore.getState().showToast(err.message || '上传失败'),
                        );
                    }}
                  />
                  {form.iconUrl ? (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                      onClick={() => setForm({ ...form, iconUrl: undefined })}
                    >
                      清除上传，改用默认图标
                    </button>
                  ) : null}
                </div>
              </div>
            </FormField>
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
              {showAdvanced ? '收起高级项' : '展开高级项（计划 / 须知 / 案例 / 环境）'}
            </button>
            {showAdvanced ? (
              <>
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
              <FormField
                label="使用须知"
                hint="前置条件、权限要求、注意事项与限制规则（详情「使用须知」Tab）"
              >
                <FormTextarea
                  rows={4}
                  value={form.usageNotes ?? ''}
                  onChange={(e) => setForm({ ...form, usageNotes: e.target.value })}
                  placeholder={'1. 前置条件…\n2. 权限要求…\n3. 注意事项…'}
                />
              </FormField>
              <FormField
                label="案例（每行一条：标题|输入|输出）"
                hint="详情「案例」Tab；竖线分隔，可只填标题"
              >
                <FormTextarea
                  rows={3}
                  className="font-mono text-[12px]"
                  value={(form.cases ?? [])
                    .map((c) => [c.title, c.input || '', c.output || ''].join('|'))
                    .join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cases: e.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [title, input, output] = line.split('|').map((s) => s.trim());
                          return { title: title || line, input, output };
                        }),
                    })
                  }
                  placeholder="周报生成|输入本周要点…|输出结构化周报…"
                />
              </FormField>
              <FormField
                label="使用案例附件"
                hint="支持 PDF / PPTX；详情「快速上手 · 使用案例」可在线预览"
              >
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    disabled={uploadingCase}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      const lower = file.name.toLowerCase();
                      if (!lower.endsWith('.pdf') && !lower.endsWith('.pptx')) {
                        showToast('仅支持 PDF / PPTX 附件');
                        return;
                      }
                      setUploadingCase(true);
                      try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(String(reader.result ?? ''));
                          reader.onerror = () => reject(reader.error ?? new Error('file_read_failed'));
                          reader.readAsDataURL(file);
                        });
                        const uploaded = await uploadWorkspaceBlob(currentWorkspaceId(), {
                          name: file.name,
                          mimeType: file.type || 'application/octet-stream',
                          dataUrl,
                        });
                        const item: PortalCasePreviewFile = {
                          name: uploaded.name,
                          mimeType: uploaded.mimeType,
                          size: uploaded.size,
                          url: uploaded.url,
                          blobId: uploaded.id,
                          kind: lower.endsWith('.pdf') ? 'pdf' : 'pptx',
                        };
                        setForm((f) => ({
                          ...f,
                          caseAttachments: [...(f.caseAttachments ?? []), item],
                        }));
                        showToast(`已上传附件：${uploaded.name}`);
                      } catch {
                        showToast('附件上传失败，请检查后端连接后重试');
                      } finally {
                        setUploadingCase(false);
                      }
                    }}
                    className="block w-full text-[12px] file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white"
                  />
                  {uploadingCase ? (
                    <p className="text-[11px] text-zinc-500">
                      <i className="fa-solid fa-spinner fa-spin mr-1" />
                      上传中…
                    </p>
                  ) : null}
                  {(form.caseAttachments ?? []).map((att, idx) => (
                    <div
                      key={`${att.blobId ?? att.name}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5"
                    >
                      <i
                        className={cn(
                          'text-[12px]',
                          att.kind === 'pdf'
                            ? 'fa-solid fa-file-pdf text-rose-500'
                            : 'fa-solid fa-file-powerpoint text-orange-500',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">{att.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            caseAttachments: (f.caseAttachments ?? []).filter((_, i) => i !== idx),
                          }))
                        }
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </FormField>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FormField label="环境依赖">
                  <FormInput
                    value={form.envInfo?.dependencies ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        envInfo: { ...form.envInfo, dependencies: e.target.value },
                      })
                    }
                    placeholder="Node / Python / 浏览器…"
                  />
                </FormField>
                <FormField label="算法框架">
                  <FormInput
                    value={form.envInfo?.framework ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        envInfo: { ...form.envInfo, framework: e.target.value },
                      })
                    }
                    placeholder="LLM / RAG / 规则引擎…"
                  />
                </FormField>
                <FormField label="运行版本">
                  <FormInput
                    value={form.envInfo?.runtimeVersion ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        envInfo: { ...form.envInfo, runtimeVersion: e.target.value },
                      })
                    }
                    placeholder="平台运行时 / 模型版本"
                  />
                </FormField>
                <FormField label="硬件 / 网络">
                  <FormInput
                    value={form.envInfo?.hardwareNetwork ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        envInfo: { ...form.envInfo, hardwareNetwork: e.target.value },
                      })
                    }
                    placeholder="内网 / GPU / 带宽要求"
                  />
                </FormField>
              </div>
              </>
            ) : null}
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
              1.0 不配置连接器：Skill 以正文与指令沉淀为主，连接器打通列入后续版本。使用须知 / 案例 / 环境请展开高级项填写。
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <FormField
              label="业务场景分类"
              hint="与业务用户 MSS 集市视角对齐；用于场景技能筛选与归类"
            >
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
                <option value="">— 请选择业务场景 —</option>
                {listVisibleBusinessScenarioCategories().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField
                label="所属职能（单选）"
                hint={
                  isPlatformOps
                    ? '每个技能只挂一个领域，避免 MSS 场景技能列表出现多职能误会'
                    : '能力开发仅可归属本人组织职能（单选）'
                }
              >
                <FormSelect
                  value={(form.ownerDeptIds ?? [])[0] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value as DeptId | '';
                    setForm({ ...form, ownerDeptIds: v ? [v] : [] });
                  }}
                >
                  <option value="">选择职能</option>
                  {HQ_DEPTS.filter((d) => selectableDepts.includes(d.id)).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </FormSelect>
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
              <p className="text-[13px] font-semibold text-zinc-800">发布权限范围</p>
              <p className="text-[11px] text-zinc-500">
                默认组织内可见（角标「领域」）：业务用户仅能看到归属命中本人领域或区域的
                Skill；发布方与平台运营可看全部。
                公开可见（角标「公开」）：不区分登录人领域/区域，需通过审批。
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="skill-vis"
                  className="accent-claw-600"
                  checked={(form.visibility ?? 'org') === 'public'}
                  onChange={() => setForm({ ...form, visibility: 'public' })}
                />
                <span className="text-[13px] font-medium text-zinc-800">
                  {ASSET_VISIBILITY_LABELS.public}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="skill-vis"
                  className="accent-claw-600"
                  checked={form.visibility === 'org'}
                  onChange={() => setForm({ ...form, visibility: 'org' })}
                />
                <span className="text-[13px] font-medium text-zinc-800">
                  {ASSET_VISIBILITY_LABELS.org}
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
                    <span className="block text-[13px] font-medium text-zinc-800">
                      精选露出到「AI工具Hub · 场景技能」
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                      {DO_TASK_FEATURED_HINT}
                    </span>
                  </span>
                </label>
                {form.featuredInDoTask ? (
                  <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-600">
                    将按第 2 步所选业务场景露出：
                    <span className="ml-1 font-semibold text-zinc-800">
                      {form.businessScenarioId
                        ? listVisibleBusinessScenarioCategories().find(
                            (c) => c.id === form.businessScenarioId,
                          )?.label ?? form.businessScenarioId
                        : '尚未选择'}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl bg-zinc-900 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-200">
              <p className="font-semibold text-white">保存后将生效</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>资产写入：Skill 沉淀</li>
                <li>
                  权限范围：
                  {ASSET_VISIBILITY_LABELS[
                    form.visibility === 'org' ? 'org' : 'public'
                  ]}
                </li>
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
