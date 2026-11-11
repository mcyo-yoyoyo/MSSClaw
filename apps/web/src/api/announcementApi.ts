import { apiAuthHeaders, apiUrl } from './client';
import { copyText } from '@/domain/assetShare';
import type { StationAnnouncement } from '@/domain/stationAnnouncementSeeds';
export type AnnouncementStats = { shares: number; pv: number; systemPv: number; sharePv: number; uv: number };
async function request(path: string, body?: unknown) {
 const response = await fetch(apiUrl(`/api/v1/announcements${path}`), { method: body ? 'POST' : 'GET', headers: { ...apiAuthHeaders(), 'Content-Type':'application/json' }, ...(body ? {body:JSON.stringify(body)} : {}) });
 if (!response.ok) throw new Error(`公告请求失败 (${response.status})`);
 return response.json();
}
export const announcementStats = (): Promise<Record<string, AnnouncementStats>> => request('/metrics');
export const announcementDetail = (id: string): Promise<StationAnnouncement> => request(`/${encodeURIComponent(id)}`);
export const announcementEvent = (id: string, kind: 'view'|'share', source: 'system'|'share', eventId = crypto.randomUUID()) => request(`/${encodeURIComponent(id)}/events`, {eventId,kind,source});
export async function shareAnnouncement(id: string) {
 const url = `${location.origin}${location.pathname}#/messages?announcement=${encodeURIComponent(id)}&source=share`;
 if (!await copyText(url)) throw new Error('复制失败，请重试');
 await announcementEvent(id,'share','system');
}
