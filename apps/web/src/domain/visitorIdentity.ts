/**
 * 访客标识：游客模式下用于 UV 去重与「游客 → 登录」转化归因。
 * 与登录身份正交，登录后仍保留，便于把注册事件关联回原访客。
 */
const VISITOR_ID_KEY = 'mssclaw_visitor_id';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // 兜底：旧内核 / 非安全上下文没有 randomUUID
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** 稳定访客 ID（localStorage 持久化）；隐私模式等读写失败时退化为一次性 ID */
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY)?.trim() ?? '';
    if (UUID_RE.test(existing)) return existing;
    const next = randomUuid();
    localStorage.setItem(VISITOR_ID_KEY, next);
    return next;
  } catch {
    return randomUuid();
  }
}

/** 上报给服务端的游客标识，格式由服务端校验 */
export function guestVisitorRef(visitorId = getVisitorId()): string {
  return `guest:${visitorId}`;
}
