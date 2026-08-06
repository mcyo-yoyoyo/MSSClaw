/**
 * 每日 AI 新闻（运营本地稿，可选）
 * 用户主阅读入口已迁至顶栏「AI快讯」（ai-bot.cn）。
 */

import { AI_NEWS_SEEDS, type AiNewsCadence, type AiNewsItem } from '@/domain/aiNewsSeeds';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useAiNewsStore } from '@/stores/aiNewsStore';

export type { AiNewsCadence, AiNewsItem };
export { AI_NEWS_SEEDS };

/** 站内唯一的「AI新闻总览」消息 id（兼容旧数据；不再向消息页灌入） */
export const AI_NEWS_OVERVIEW_INBOX_ID = 'ainews-overview';

export function newsDayKey(iso: string): string {
  return (iso || '').slice(0, 10);
}

/** 已上架新闻（新→旧） */
export function getPublishedAiNews(): AiNewsItem[] {
  return useAiNewsStore.getState().listPublished();
}

export function getLatestPublishedAiNews(): AiNewsItem | null {
  return getPublishedAiNews()[0] ?? null;
}

/** 清理历史按条灌入的 AI 新闻 inbox，并移除总览入口（阅读改走 AI快讯） */
export function ensureAiNewsOverviewInbox() {
  const inbox = useInboxStore.getState();
  const cleaned = inbox.messages.filter((m) => m.kind !== 'ai_news');
  if (cleaned.length !== inbox.messages.length) {
    useInboxStore.setState({ messages: cleaned });
    inbox.persist();
  }
}

/** @deprecated 使用 ensureAiNewsOverviewInbox */
export function ensureAiNewsInbox() {
  ensureAiNewsOverviewInbox();
}

/** 打开 AI快讯；可选定位到某一条 */
export function openAiNewsOverview(focusId?: string) {
  ensureAiNewsOverviewInbox();
  const intent = useNavigationIntentStore.getState();
  intent.focusAiNewsOverview(focusId);
  useAppViewStore.getState().setAppView('ai-brief');
}

export function openAiNews(id: string) {
  openAiNewsOverview(id);
}

export function openAiNewsList() {
  openAiNewsOverview();
}
