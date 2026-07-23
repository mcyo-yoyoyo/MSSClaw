/**
 * 展示配置 · 四角色 × 三方案（侧栏可见、非 hidden）预期摘要。
 * 供自检与文档；矩阵真源仍是 buildRoleNavPreset。
 */
import {
  buildRoleNavPreset,
  isBusinessShellRole,
  isBusinessShellSlot,
  NAV_PRESENTATION_META,
  type NavPresetId,
  type NavSlotId,
  type RoleNavMatrix,
} from '@/domain/navPresentation';
import type { PlatformRole } from '@/domain/rbac';

const PRESETS: Exclude<NavPresetId, 'custom'>[] = ['customer', 'standard', 'full'];

/** 配置页/侧栏可见的槽位（与 PresentationConfig 过滤一致） */
export function listConfigurableSidebarSlots(role: PlatformRole): NavSlotId[] {
  return NAV_PRESENTATION_META.filter((m) => {
    if (m.hiddenFromSidebar) return false;
    if (isBusinessShellRole(role) && !isBusinessShellSlot(m.id)) return false;
    if (m.adminOnly && role !== 'super_admin') return false;
    return true;
  }).map((m) => m.id);
}

export function listEnabledSidebarSlots(
  matrix: RoleNavMatrix,
  role: PlatformRole,
): NavSlotId[] {
  return listConfigurableSidebarSlots(role).filter((id) => matrix[role][id] === true);
}

/** 三种命名方案下各角色启用的侧栏槽位 */
export function snapshotNamedPresets(): Record<
  Exclude<NavPresetId, 'custom'>,
  Record<PlatformRole, NavSlotId[]>
> {
  const out = {} as Record<
    Exclude<NavPresetId, 'custom'>,
    Record<PlatformRole, NavSlotId[]>
  >;
  for (const preset of PRESETS) {
    const matrix = buildRoleNavPreset(preset);
    out[preset] = {
      super_admin: listEnabledSidebarSlots(matrix, 'super_admin'),
      capability_ops: listEnabledSidebarSlots(matrix, 'capability_ops'),
      business_user: listEnabledSidebarSlots(matrix, 'business_user'),
      viewer: listEnabledSidebarSlots(matrix, 'viewer'),
    };
  }
  return out;
}

/**
 * 结构性校验：业务壳无运营项；三方案对超管/运营递增；访客无任务/协作空间。
 * 返回错误文案列表（空 = 通过）。
 */
export function validateNamedPresetMatrices(): string[] {
  const errors: string[] = [];
  const snap = snapshotNamedPresets();

  for (const preset of PRESETS) {
    for (const role of ['business_user', 'viewer'] as PlatformRole[]) {
      for (const id of snap[preset][role]) {
        if (!isBusinessShellSlot(id)) {
          errors.push(`${preset}/${role} 不应启用运营槽位 ${id}`);
        }
      }
    }
    if (snap[preset].viewer.includes('task') || snap[preset].viewer.includes('warroom')) {
      errors.push(`${preset}/viewer 不应启用 task/warroom`);
    }
    if (preset !== 'full' && snap[preset].business_user.includes('warroom')) {
      errors.push(`${preset}/business_user 不应默认启用 warroom`);
    }
    if (preset === 'full' && !snap[preset].business_user.includes('warroom')) {
      errors.push(`full/business_user 应默认启用 warroom`);
    }
  }

  const mvpOps = new Set(snap.customer.capability_ops);
  const stdOps = new Set(snap.standard.capability_ops);
  const fullOps = new Set(snap.full.capability_ops);
  for (const id of mvpOps) {
    if (!stdOps.has(id)) errors.push(`standard/capability_ops 应包含 MVP 的 ${id}`);
    if (!fullOps.has(id)) errors.push(`full/capability_ops 应包含 MVP 的 ${id}`);
  }
  for (const id of ['kb', 'automation'] as NavSlotId[]) {
    if (!stdOps.has(id)) errors.push(`standard/capability_ops 应启用 ${id}`);
  }
  for (const id of ['memory', 'workflow'] as NavSlotId[]) {
    if (!fullOps.has(id)) errors.push(`full/capability_ops 应启用 ${id}`);
  }

  const mvpAdmin = new Set(snap.customer.super_admin);
  const stdAdmin = new Set(snap.standard.super_admin);
  const fullAdmin = new Set(snap.full.super_admin);
  // 超管三方案必须可区分：MVP < 标准 ≤ 完整（按启用数量）
  if (mvpAdmin.size >= stdAdmin.size) {
    errors.push(
      `super_admin MVP(${mvpAdmin.size}) 应少于 standard(${stdAdmin.size})，当前可能 MVP=完整版`,
    );
  }
  if (stdAdmin.size > fullAdmin.size) {
    errors.push(`super_admin standard(${stdAdmin.size}) 不应多于 full(${fullAdmin.size})`);
  }
  for (const id of ['admin', 'presentation', 'workspace-config', 'portal-ops'] as NavSlotId[]) {
    if (!mvpAdmin.has(id)) errors.push(`customer/super_admin 应启用治理项 ${id}`);
  }

  return errors;
}
