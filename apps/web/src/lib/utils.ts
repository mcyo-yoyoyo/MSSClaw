import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseMentions(message: string): string[] {
  const matches = message.match(/@([\u4e00-\u9fa5\w\s]+?)(?=\s|$|[，。！？])/g);
  return matches?.map((m) => m.slice(1).trim()) ?? [];
}

export function resolveAgentType(
  chatId: string,
  message: string,
): 'marketing' | 'knowledge' {
  const knowledgeChats = new Set(['knowledge', 'rd_rag']);
  const groupChats = new Set(['campaign_ops']);

  if (!groupChats.has(chatId)) {
    return knowledgeChats.has(chatId) ? 'knowledge' : 'marketing';
  }

  const mentions = parseMentions(message);
  if (mentions.some((m) => m.includes('知识'))) return 'knowledge';
  if (mentions.some((m) => m.includes('营销') || m.includes('洞察'))) return 'marketing';
  if (message.includes('知识') || message.includes('SOP') || message.includes('合规')) return 'knowledge';
  return 'marketing';
}
