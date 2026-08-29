import { useEffect } from 'react';
import type { AppView } from '@/domain/appView';
import { recordPortalPageViewApi } from '@/api/portalAnalyticsApi';
import { guestVisitorRef } from '@/domain/visitorIdentity';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const PORTAL_TRAFFIC_VIEWS = new Set<AppView>([
  'home',
  'me',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'ai-tasks',
  'market-tool',
  'ai-map',
  'task',
  'messages',
]);

interface LogicalRouteEntry {
  key: string;
  eventId: string;
}

/**
 * React StrictMode 会在开发态重放 effect。把当前逻辑导航保存在模块级，确保重放时
 * 复用同一 eventId；服务端再以 eventId 幂等落库，覆盖重试和响应丢失场景。
 */
let currentEntry: LogicalRouteEntry | null = null;
const inFlightEventIds = new Set<string>();
const completedEventIds = new Set<string>();
const MAX_COMPLETED_EVENT_IDS = 1_000;
const RECORD_RETRY_DELAYS_MS = [0, 500, 1_500] as const;

function createEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateEntry(key: string): LogicalRouteEntry {
  if (currentEntry?.key === key) return currentEntry;
  currentEntry = { key, eventId: createEventId() };
  return currentEntry;
}

function rememberCompletedEvent(eventId: string): void {
  completedEventIds.add(eventId);
  while (completedEventIds.size > MAX_COMPLETED_EVENT_IDS) {
    const oldest = completedEventIds.values().next().value;
    if (!oldest) break;
    completedEventIds.delete(oldest);
  }
}

async function recordWithRetry(
  workspaceId: string,
  input: { eventId: string; routeKey: string; visitorId: string },
): Promise<void> {
  let lastError: unknown;
  for (const delay of RECORD_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
    }
    try {
      await recordPortalPageViewApi(workspaceId, input);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function toVisitorRef(input: {
  isAuthenticated: boolean;
  userId: string;
  visitorId: string;
}): string {
  if (input.isAuthenticated) {
    const userId = input.userId.trim();
    return userId ? `user:${userId}` : '';
  }
  const visitorId = input.visitorId.trim();
  return visitorId ? guestVisitorRef(visitorId) : '';
}

export function usePortalTrafficTracking(): void {
  const appView = useAppViewStore((state) => state.appView);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const shellReady = useSessionStore((state) => state.shellReady);
  const userId = useSessionStore((state) => state.user?.id ?? '');
  const visitorId = useSessionStore((state) => state.visitorId);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const catalogReady = useWorkspaceStore((state) => state.catalogReady);
  const apiConnected = useWorkspaceStore((state) => state.apiConnected);
  const visitorRef = toVisitorRef({ isAuthenticated, userId, visitorId });
  // 游客与登录后的页面上报都携带同一浏览器访客 ID，供服务端关联转化旅程。
  const journeyVisitorId = visitorId ? guestVisitorRef(visitorId) : '';

  useEffect(() => {
    if (
      !shellReady ||
      !visitorRef ||
      !journeyVisitorId ||
      !workspaceId ||
      !catalogReady ||
      !apiConnected ||
      !PORTAL_TRAFFIC_VIEWS.has(appView)
    ) {
      // 离开业务门户后清空当前 entry；再次进入同一页面应视为一次新 PV。
      currentEntry = null;
      return;
    }

    const entry = getOrCreateEntry(`${workspaceId}:${visitorRef}:${appView}`);
    const timer = window.setTimeout(() => {
      const latestSession = useSessionStore.getState();
      const latestWorkspace = useWorkspaceStore.getState();
      const latestVisitorRef = toVisitorRef({
        isAuthenticated: latestSession.isAuthenticated,
        userId: latestSession.user?.id ?? '',
        visitorId: latestSession.visitorId,
      });
      const latestJourneyVisitorId = latestSession.visitorId
        ? guestVisitorRef(latestSession.visitorId)
        : '';
      if (
        useAppViewStore.getState().appView !== appView ||
        !latestSession.shellReady ||
        latestVisitorRef !== visitorRef ||
        latestJourneyVisitorId !== journeyVisitorId ||
        latestWorkspace.workspaceId !== workspaceId ||
        !latestWorkspace.catalogReady ||
        !latestWorkspace.apiConnected ||
        currentEntry?.eventId !== entry.eventId
      ) {
        return;
      }
      if (inFlightEventIds.has(entry.eventId) || completedEventIds.has(entry.eventId)) return;

      inFlightEventIds.add(entry.eventId);
      void recordWithRetry(workspaceId, {
        eventId: entry.eventId,
        routeKey: appView,
        visitorId: journeyVisitorId,
      })
        .then(() => {
          rememberCompletedEvent(entry.eventId);
        })
        .catch(() => {
          // 三次均失败时不阻塞页面；每次重试复用 eventId，服务端唯一键避免响应丢失后重复 PV。
        })
        .finally(() => {
          inFlightEventIds.delete(entry.eventId);
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    apiConnected,
    appView,
    catalogReady,
    journeyVisitorId,
    shellReady,
    visitorRef,
    workspaceId,
  ]);
}
