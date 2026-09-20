import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { oauthConfig } from './oauth.config';

interface StateEntry {
  workspaceId: string;
  returnTo: string;
  createdAt: number;
  usedAt: number | null;
  traceId: string;
}

export type StateCheck =
  | { ok: true; entry: StateEntry }
  | { ok: false; reason: 'missing' | 'used' | 'expired'; entry?: StateEntry };

/**
 * 授权请求的 state 暂存。一次性 + TTL，防重放。
 *
 * 用内存 Map：当前是单 Node 进程部署，state 生命周期只有 10 分钟，
 * 进程重启时正在登录的用户重点一次即可。多实例部署时必须换共享存储，
 * 届时 diagnostics 里的 instanceId 能帮着确认是不是被轮询打散了。
 */
@Injectable()
export class OAuthStateStore implements OnModuleDestroy {
  private readonly logger = new Logger(OAuthStateStore.name);
  private readonly entries = new Map<string, StateEntry>();
  private readonly sweeper: NodeJS.Timeout;
  /** 进程标识：多实例部署时用来判断 state 是不是落到了另一个实例 */
  readonly instanceId = randomBytes(3).toString('hex');

  private issuedCount = 0;
  private consumedCount = 0;
  private rejectedCount = 0;

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  issue(workspaceId: string, returnTo: string, traceId: string): string {
    const state = randomBytes(16).toString('hex');
    this.entries.set(state, {
      workspaceId,
      returnTo,
      createdAt: Date.now(),
      usedAt: null,
      traceId,
    });
    this.issuedCount += 1;
    return state;
  }

  /** 校验并立即作废：同一个 state 第二次进来必定失败 */
  consume(state: string): StateCheck {
    const entry = this.entries.get(state);
    if (!entry) {
      this.rejectedCount += 1;
      return { ok: false, reason: 'missing' };
    }
    if (entry.usedAt) {
      this.rejectedCount += 1;
      return { ok: false, reason: 'used', entry };
    }
    if (Date.now() - entry.createdAt > oauthConfig().stateTtlMs) {
      this.rejectedCount += 1;
      this.entries.delete(state);
      return { ok: false, reason: 'expired', entry };
    }
    entry.usedAt = Date.now();
    this.consumedCount += 1;
    // 保留一小会儿，好让「重复提交」能报 used 而不是 missing——两者的排查方向完全不同
    setTimeout(() => this.entries.delete(state), 120_000).unref?.();
    return { ok: true, entry };
  }

  private sweep(): void {
    const ttl = oauthConfig().stateTtlMs;
    const now = Date.now();
    let removed = 0;
    for (const [state, entry] of this.entries) {
      if (now - entry.createdAt > ttl + 120_000) {
        this.entries.delete(state);
        removed += 1;
      }
    }
    if (removed) this.logger.debug(`[oauth] swept ${removed} expired states`);
  }

  stats() {
    return {
      instanceId: this.instanceId,
      pending: this.entries.size,
      issued: this.issuedCount,
      consumed: this.consumedCount,
      rejected: this.rejectedCount,
      ttlMs: oauthConfig().stateTtlMs,
    };
  }
}
