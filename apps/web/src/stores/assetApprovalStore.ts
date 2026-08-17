import { create } from 'zustand';
import type {
  AssetApprovalKind,
  AssetApprovalReason,
  AssetApprovalRequest,
} from '@/domain/assetApproval';
import { approvalActionTitle } from '@/domain/assetApproval';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useInboxStore } from '@/stores/inboxStore';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

export type AssetApprovalRecord = AssetApprovalRequest & {
  id: string;
  status: 'pending' | 'approved' | 'cancelled' | 'rejected';
  updatedAt: number;
  decidedAt?: number;
  rejectNote?: string;
};

export type ApprovalWatchItem = {
  kind: AssetApprovalKind;
  assetId: string;
  assetName: string;
};

type ApprovalsDoc = {
  items?: AssetApprovalRecord[];
  watchedByUserId?: Record<string, ApprovalWatchItem[]>;
};

interface AssetApprovalState {
  current: AssetApprovalRequest | null;
  /** 当前弹窗对应的 history id（便于驳回/推进时对齐） */
  currentRecordId: string | null;
  history: AssetApprovalRecord[];
  watched: ApprovalWatchItem[];
  hydrate: () => void;
  openApproval: (input: Omit<AssetApprovalRequest, 'stepIndex' | 'createdAt' | 'submitterName'> & {
    submitterName?: string;
    reasons?: AssetApprovalReason[];
    note?: string;
    targetVersion?: string;
    packageName?: string;
    packageBlobId?: string;
    packageUrl?: string;
    unpublishMode?: AssetApprovalRequest['unpublishMode'];
    unpublishVersions?: string[];
  }) => void;
  /** 从历史恢复待办到弹窗 */
  resumePending: (recordId: string) => void;
  advance: () => void;
  /** 驳回：不强制意见 */
  reject: (note?: string) => void;
  /** 撤回本人未办结单 */
  withdraw: (recordId: string) => void;
  toggleWatch: (item: ApprovalWatchItem) => void;
  isWatched: (assetId: string, kind: AssetApprovalKind) => boolean;
  close: () => void;
}

function userBucket() {
  return getCurrentUserId() || 'anonymous';
}

function persistDoc(items: AssetApprovalRecord[], watchedByUserId: Record<string, ApprovalWatchItem[]>) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'asset-approvals', {
    items: items.slice(0, 200),
    watchedByUserId,
  } satisfies ApprovalsDoc);
}

function persistFromState(
  items: AssetApprovalRecord[],
  watched: ApprovalWatchItem[],
  prevWatchedMap?: Record<string, ApprovalWatchItem[]>,
) {
  const map = { ...(prevWatchedMap ?? {}) };
  map[userBucket()] = watched.slice(0, 80);
  persistDoc(items, map);
}

function applyApproval(kind: AssetApprovalKind, assetId: string, req: AssetApprovalRequest) {
  const reasons = req.reasons?.length ? req.reasons : (['publish_executable'] as AssetApprovalReason[]);
  const market = useMarketplaceStore.getState();
  const wantUnpublish = reasons.includes('unpublish_skill');
  const wantUpdate = reasons.includes('update_version');
  const wantPublish = reasons.includes('publish_executable') || (!wantUnpublish && !wantUpdate && reasons.length === 0);
  const wantPublic = reasons.includes('visibility_public');
  const stamp = new Date().toISOString().slice(0, 10);
  const actor = req.submitterName || '系统';

  if (kind === 'agent') {
    const agent = market.agents.find((a) => a.id === assetId);
    if (agent) {
      market.upsertAgent({
        ...agent,
        ...(wantUnpublish ? { published: false } : {}),
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  } else if (kind === 'skill') {
    const skill = market.skills.find((s) => s.id === assetId);
    if (skill) {
      if (wantUnpublish) {
        const retireVersions = new Set(req.unpublishVersions ?? []);
        const nextVersions = (skill.versions ?? []).map((version) =>
          req.unpublishMode === 'versions' && retireVersions.has(version.version)
            ? { ...version, status: 'retired' as const }
            : version,
        );
        const unpublishAll = req.unpublishMode !== 'versions';
        market.upsertSkill({
          ...skill,
          published: unpublishAll ? false : skill.published,
          featuredInDoTask: unpublishAll ? false : skill.featuredInDoTask,
          featuredInMssMarket: unpublishAll ? false : skill.featuredInMssMarket,
          versions: nextVersions,
          updatedAt: stamp,
          updatedBy: actor,
        });
      } else {
        const nextVersion = req.targetVersion || skill.version;
        const versions = [...(skill.versions ?? [])];
        if (wantUpdate && nextVersion) {
          const exists = versions.some((v) => v.version === nextVersion);
          if (!exists) {
            versions.unshift({
              version: nextVersion,
              notes: req.note,
              publishedAt: stamp,
              status: 'active',
            });
          } else {
            versions.forEach((v) => {
              if (v.version === nextVersion) {
                v.status = 'active';
                v.notes = req.note || v.notes;
                v.publishedAt = stamp;
              } else if (v.status === 'active') {
                v.status = 'retired';
              }
            });
          }
        }
        market.upsertSkill({
          ...skill,
          ...(wantPublish || wantUpdate ? { published: true } : {}),
          ...(wantPublic ? { visibility: 'public' as const } : {}),
          ...(wantUpdate && req.targetVersion ? { version: req.targetVersion } : {}),
          ...(wantUpdate ? { versions } : {}),
          updatedAt: stamp,
          updatedBy: actor,
        });
      }
    }
  } else if (kind === 'tool') {
    const tool = market.tools.find((t) => t.id === assetId);
    if (tool) {
      market.upsertTool({
        ...tool,
        ...(wantUnpublish ? { published: false } : {}),
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  } else if (kind === 'kb') {
    const doc = market.kbDocs.find((d) => d.id === assetId);
    if (doc) market.upsertKbDoc({ ...doc, indexed: true });
  } else if (kind === 'automation') {
    const auto = market.automations.find((a) => a.id === assetId);
    if (auto) market.upsertAutomation({ ...auto, enabled: true });
  } else if (kind === 'portal') {
    const portal = usePortalContentStore.getState();
    const item = portal.items.find((i) => i.id === assetId);
    if (item) {
      portal.upsertItem({
        ...item,
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  }
}

function newId() {
  return `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let lastWatchedMap: Record<string, ApprovalWatchItem[]> = {};

export const useAssetApprovalStore = create<AssetApprovalState>((set, get) => ({
  current: null,
  currentRecordId: null,
  history: [],
  watched: [],

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ history: [], watched: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<ApprovalsDoc>(
          currentWorkspaceId(),
          'asset-approvals',
        );
        const items = Array.isArray(remote?.items) ? remote.items : [];
        lastWatchedMap =
          remote?.watchedByUserId && typeof remote.watchedByUserId === 'object'
            ? remote.watchedByUserId
            : {};
        const watched = lastWatchedMap[userBucket()] ?? [];
        set({ history: items.slice(0, 200), watched });
      } catch {
        set({ history: [], watched: [] });
      }
    })();
  },

  openApproval: (input) => {
    const now = Date.now();
    const req: AssetApprovalRequest = {
      kind: input.kind,
      assetId: input.assetId,
      assetName: input.assetName,
      submitterName: input.submitterName || getCurrentUserName() || '未知用户',
      submitterUserId: getCurrentUserId() || undefined,
      stepIndex: 1,
      createdAt: now,
      reasons: input.reasons?.length ? input.reasons : ['publish_executable'],
      note: input.note?.trim() || undefined,
      targetVersion: input.targetVersion?.trim() || undefined,
      packageName: input.packageName?.trim() || undefined,
      unpublishMode: input.unpublishMode,
      unpublishVersions: input.unpublishVersions,
    };
    const recordId = newId();
    const record: AssetApprovalRecord = {
      ...req,
      id: recordId,
      status: 'pending',
      updatedAt: now,
    };
    const history = [record, ...get().history].slice(0, 200);
    persistFromState(history, get().watched, lastWatchedMap);
    set({ current: req, currentRecordId: recordId, history });
  },

  resumePending: (recordId) => {
    const rec = get().history.find((h) => h.id === recordId && h.status === 'pending');
    if (!rec) return;
    const { id: _id, status: _s, updatedAt: _u, decidedAt: _d, rejectNote: _r, ...req } = rec;
    set({ current: req, currentRecordId: rec.id });
  },

  advance: () => {
    const cur = get().current;
    const recordId = get().currentRecordId;
    if (!cur) return;
    const next = cur.stepIndex + 1;
    if (next >= 3) {
      applyApproval(cur.kind, cur.assetId, cur);
      const now = Date.now();
      const history = get().history.map((h) =>
        (recordId ? h.id === recordId : h.assetId === cur.assetId && h.status === 'pending')
          ? { ...h, stepIndex: 3, status: 'approved' as const, updatedAt: now, decidedAt: now }
          : h,
      );
      persistFromState(history, get().watched, lastWatchedMap);
      const reasons = cur.reasons ?? [];
      const doneMsg = reasons.includes('unpublish_skill')
        ? `「${cur.assetName}」已通过下架审批，集市已隐藏`
        : reasons.includes('update_version')
          ? `「${cur.assetName}」更新已生效并同步集市`
          : `「${cur.assetName}」已通过上架审批`;
      useMarketplaceStore.getState().showToast(doneMsg);
      if (cur.submitterUserId) {
        useInboxStore.getState().pushMessage({
          kind: 'system',
          title: approvalActionTitle(cur.reasons) + '已通过',
          body: doneMsg,
          toUserId: cur.submitterUserId,
          fromName: 'MSS 质量与运营',
        });
      }
      set({ current: null, currentRecordId: null, history });
      return;
    }
    const updated: AssetApprovalRequest = { ...cur, stepIndex: next };
    const history = get().history.map((h) =>
      (recordId ? h.id === recordId : h.assetId === cur.assetId && h.status === 'pending')
        ? { ...h, stepIndex: next, updatedAt: Date.now() }
        : h,
    );
    persistFromState(history, get().watched, lastWatchedMap);
    set({ current: updated, history });
  },

  reject: (note) => {
    const cur = get().current;
    const recordId = get().currentRecordId;
    if (!cur) return;
    const now = Date.now();
    const history = get().history.map((h) =>
      (recordId ? h.id === recordId : h.assetId === cur.assetId && h.status === 'pending')
        ? {
            ...h,
            status: 'rejected' as const,
            updatedAt: now,
            decidedAt: now,
            rejectNote: note?.trim() || undefined,
          }
        : h,
    );
    persistFromState(history, get().watched, lastWatchedMap);
    useMarketplaceStore
      .getState()
      .showToast(`「${cur.assetName}」审批已驳回，已通知提交人`);
    if (cur.submitterUserId) {
      useInboxStore.getState().pushMessage({
        kind: 'system',
        title: `${approvalActionTitle(cur.reasons)}已驳回`,
        body: `「${cur.assetName}」审批未通过。${note?.trim() ? `驳回意见：${note.trim()}` : '审批人未填写驳回意见。'}请修改后重新提交。`,
        toUserId: cur.submitterUserId,
        fromName: '审批中心',
      });
    }
    set({ current: null, currentRecordId: null, history });
  },

  withdraw: (recordId) => {
    const me = getCurrentUserName();
    const history = get().history.map((h) =>
      h.id === recordId && h.status === 'pending' && h.submitterName === me
        ? { ...h, status: 'cancelled' as const, updatedAt: Date.now() }
        : h,
    );
    persistFromState(history, get().watched, lastWatchedMap);
    const cur = get().current;
    const clear =
      get().currentRecordId === recordId ||
      (cur && history.some((h) => h.id === recordId && h.assetId === cur.assetId));
    set({
      history,
      ...(clear ? { current: null, currentRecordId: null } : {}),
    });
  },

  toggleWatch: (item) => {
    const exists = get().watched.some((w) => w.assetId === item.assetId && w.kind === item.kind);
    const watched = exists
      ? get().watched.filter((w) => !(w.assetId === item.assetId && w.kind === item.kind))
      : [{ ...item }, ...get().watched].slice(0, 80);
    lastWatchedMap = { ...lastWatchedMap, [userBucket()]: watched };
    persistFromState(get().history, watched, lastWatchedMap);
    set({ watched });
  },

  isWatched: (assetId, kind) =>
    get().watched.some((w) => w.assetId === assetId && w.kind === kind),

  close: () => {
    const cur = get().current;
    const recordId = get().currentRecordId;
    if (cur) {
      // 「稍后处理」仅关闭弹窗，不取消单据
      void cur;
      void recordId;
      set({ current: null, currentRecordId: null });
      return;
    }
    set({ current: null, currentRecordId: null });
  },
}));
