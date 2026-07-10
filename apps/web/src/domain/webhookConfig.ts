const LS_KEY = 'mssclaw_warroom_webhook';

export function loadWarroomWebhookUrl(): string {
  return localStorage.getItem(LS_KEY) ?? '';
}

export function saveWarroomWebhookUrl(url: string) {
  localStorage.setItem(LS_KEY, url.trim());
}
