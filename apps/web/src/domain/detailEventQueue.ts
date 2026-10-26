type QueueOptions<T, R> = {
  ready: () => boolean;
  identity: () => string | null;
  send: (value: T) => Promise<R>;
  success: (value: T, result: R) => void;
  maxAttempts?: number;
  retryDelayMs?: number;
  ttlMs?: number;
};

export function createMarketEngagementEventId(source: { randomUUID?: () => string } = globalThis.crypto ?? {}): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  return `eng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Session-memory only: retries reuse the server's idempotency key, never fabricate local counts. */
export function createDetailEventQueue<T, R>(options: QueueOptions<T, R>) {
  type Entry = { value: T; identity: string | null; attempts: number; nextAt: number; expiresAt: number; sending: boolean };
  const pending = new Map<string, Entry>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    const dates = [...pending.values()].filter(entry => !entry.sending).map(entry =>
      options.ready() ? Math.min(entry.nextAt, entry.expiresAt) : entry.expiresAt);
    if (dates.length) timer = setTimeout(flush, Math.max(1, Math.min(...dates) - Date.now()));
  };
  const flush = () => {
    clearTimeout(timer);
    for (const [key, entry] of pending) {
      if (entry.expiresAt <= Date.now() || entry.identity !== options.identity()) { pending.delete(key); continue; }
      if (!options.ready() || entry.sending || entry.nextAt > Date.now()) continue;
      entry.sending = true;
      entry.attempts++;
      void options.send(entry.value).then(result => {
        pending.delete(key);
        if (entry.identity === options.identity()) options.success(entry.value, result);
      }).catch(() => {
        if (entry.attempts >= (options.maxAttempts ?? 3)) pending.delete(key);
        else entry.nextAt = Date.now() + (options.retryDelayMs ?? 1000) * entry.attempts;
      }).finally(() => { entry.sending = false; schedule(); });
    }
    schedule();
  };
  return {
    enqueue(key: string, value: T) {
      if (pending.has(key)) return;
      if (pending.size >= 100) return;
      pending.set(key, { value, identity: options.identity(), attempts: 0, nextAt: Date.now(), expiresAt: Date.now() + (options.ttlMs ?? 300_000), sending: false });
      flush();
    },
    flush,
    dispose() { clearTimeout(timer); pending.clear(); },
  };
}
