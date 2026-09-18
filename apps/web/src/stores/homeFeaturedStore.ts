import { create } from 'zustand';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  savePlatformDoc,
} from '@/api/platformDocsApi';
import {
  HOME_CHANNEL_KINDS,
  HOME_FEATURED_MAX_PER_CHANNEL,
  type HomeFeaturedChannels,
} from '@/domain/homeFeatured';

const DOC_KIND = 'home-featured' as const;

interface HomeFeaturedDocument {
  version?: number;
  revision?: number;
  channels?: Partial<Record<string, unknown>>;
}

function parseDocument(remote: HomeFeaturedDocument | null): {
  revision: number;
  channels: HomeFeaturedChannels | null;
} {
  const revision =
    typeof remote?.revision === 'number' && Number.isSafeInteger(remote.revision)
      ? remote.revision
      : 0;
  const raw = remote?.channels;
  // revision 为 0 说明从未保存过首页配置，首页继续沿用旧规则。
  if (!revision || !raw || typeof raw !== 'object') return { revision, channels: null };
  const channels = {} as HomeFeaturedChannels;
  for (const kind of HOME_CHANNEL_KINDS) {
    const list = Array.isArray(raw[kind]) ? (raw[kind] as unknown[]) : [];
    channels[kind] = [
      ...new Set(list.filter((ref): ref is string => typeof ref === 'string' && Boolean(ref))),
    ].slice(0, HOME_FEATURED_MAX_PER_CHANNEL);
  }
  return { revision, channels };
}

async function fetchFresh(workspaceId: string) {
  return parseDocument(
    await fetchPlatformDoc<HomeFeaturedDocument>(workspaceId, DOC_KIND, { fresh: true }),
  );
}

/** 切换工作区或重新加载后，迟到的旧请求不能覆盖当前数据。 */
let operationGeneration = 0;

export interface HomeFeaturedState {
  workspaceId: string | null;
  revision: number;
  /** null：从未保存过首页配置 */
  channels: HomeFeaturedChannels | null;
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hydrate: (workspaceId?: string) => Promise<boolean>;
  save: (channels: HomeFeaturedChannels) => Promise<boolean>;
}

export const useHomeFeaturedStore = create<HomeFeaturedState>((set, get) => ({
  workspaceId: null,
  revision: 0,
  channels: null,
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  hydrate: async (requestedWorkspaceId) => {
    const workspaceId = (requestedWorkspaceId || currentWorkspaceId()).trim();
    if (!workspaceId || workspaceId !== currentWorkspaceId()) return false;
    const previous = get();
    if (previous.workspaceId === workspaceId && (previous.loading || previous.saving)) {
      return false;
    }
    const switchedWorkspace = previous.workspaceId !== workspaceId;
    const generation = ++operationGeneration;
    set({
      workspaceId,
      loading: true,
      error: null,
      ...(switchedWorkspace ? { revision: 0, channels: null, loaded: false } : {}),
    });
    if (!canUsePlatformDocsApi()) {
      if (generation === operationGeneration) {
        set({ loading: false, error: '未连接后端，无法加载首页配置。' });
      }
      return false;
    }
    try {
      const fresh = await fetchFresh(workspaceId);
      if (generation !== operationGeneration || currentWorkspaceId() !== workspaceId) {
        return false;
      }
      set({ ...fresh, loaded: true, loading: false });
      return true;
    } catch {
      if (generation !== operationGeneration) return false;
      set({ loading: false, error: '首页配置加载失败，请稍后刷新重试。' });
      return false;
    }
  },

  save: async (channels) => {
    const state = get();
    const workspaceId = state.workspaceId;
    if (state.loading || state.saving) return false;
    if (!state.loaded || !workspaceId || currentWorkspaceId() !== workspaceId) {
      set({ error: '首页配置尚未从服务器加载完成，请刷新后重试。' });
      return false;
    }
    if (!canUsePlatformDocsApi()) {
      set({ error: '未连接后端，首页配置未保存。' });
      return false;
    }
    const generation = ++operationGeneration;
    set({ saving: true, error: null });
    let writeSucceeded = false;
    try {
      await savePlatformDoc(workspaceId, DOC_KIND, {
        version: 1,
        revision: state.revision,
        channels,
      });
      writeSucceeded = true;
      // 以服务端规范化后的数据为准，而不是直接发布本地草稿。
      const fresh = await fetchFresh(workspaceId);
      if (generation !== operationGeneration || currentWorkspaceId() !== workspaceId) {
        return false;
      }
      set({ ...fresh, loaded: true, saving: false });
      return true;
    } catch (error) {
      if (generation !== operationGeneration) return false;
      const message = error instanceof Error ? error.message : '';
      set({
        saving: false,
        error: writeSucceeded
          ? '首页配置已写入服务器，但读取确认失败，请刷新后查看。'
          : message.endsWith('_409')
            ? '保存冲突：首页配置已被其他管理员更新，请刷新后重试。'
            : message.endsWith('_403') || message.endsWith('_401')
              ? '保存失败：仅超级管理员可以修改首页配置。'
              : '保存失败：改动未写入服务器，请确认登录状态与后端连接后重试。',
      });
      return false;
    }
  },
}));
