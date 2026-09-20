import { Injectable, Logger } from '@nestjs/common';
import { PlatformDocsService } from '../persistence/platform-docs.service';
import { OAuthStateStore } from './oauth-state.store';
import { UniPortalClient } from './uniportal.client';
import { describeIdentity, extractIdentity, toEmailCandidate } from './oauth-identity';
import {
  authMode,
  configErrors,
  oauthConfig,
  validateOAuthConfig,
  type ConfigCheck,
} from './oauth.config';
import { OAuthTrace } from './oauth-trace';

export interface CallbackFailure {
  ok: false;
  code: string;
  error: string;
  /** 面向部署/排障人员的具体原因，前端折叠在「详细信息」里 */
  detail: string;
  /** 下一步该干什么 */
  hint: string;
  traceId: string;
  steps: string[];
}

export interface CallbackSuccess {
  ok: true;
  token: string;
  expiresAt: string;
  user: Record<string, unknown>;
  traceId: string;
  provisioned: boolean;
}

@Injectable()
export class AuthOAuthService {
  private readonly logger = new Logger('AuthOAuth');

  constructor(
    private readonly docs: PlatformDocsService,
    private readonly states: OAuthStateStore,
    private readonly client: UniPortalClient,
  ) {}

  /** 启动时把配置自检结果打到日志：配错了不用等真人登录才发现 */
  logStartupCheck(): void {
    const checks = validateOAuthConfig();
    const errors = configErrors(checks);
    if (authMode() !== 'oauth') {
      this.logger.log('[oauth] AUTH_MODE=password（账号密码登录）');
      return;
    }
    for (const check of checks) {
      const line = `[oauth] ${check.key} = ${check.detail}`;
      if (!check.ok && check.level === 'error') this.logger.error(line);
      else if (!check.ok) this.logger.warn(line);
      else this.logger.log(line);
    }
    if (errors.length) {
      this.logger.error(
        `[oauth] 配置不完整，登录会失败：${errors.map((e) => e.key).join('、')}。` +
          '填好 apps/api/.env.oauth 后重启；自检接口 GET /api/v1/auth/oauth/diagnostics',
      );
    } else {
      this.logger.log('[oauth] 配置自检通过，等待登录请求');
    }
  }

  authConfig() {
    const config = oauthConfig();
    return {
      mode: config.mode,
      providerLabel: config.mode === 'oauth' ? '企业统一身份认证' : '账号密码',
      /** 配置有硬错误时前端要显式提示，而不是把登录按钮摆在那儿点了必失败 */
      ready: config.mode !== 'oauth' || configErrors(validateOAuthConfig(config)).length === 0,
    };
  }

  buildAuthorizeUrl(workspaceId: string, returnTo: string) {
    const config = oauthConfig();
    const trace = new OAuthTrace(this.logger);
    const errors = configErrors(validateOAuthConfig(config));
    if (errors.length) {
      trace.fail('config_incomplete', errors.map((e) => `${e.key}: ${e.detail}`).join('; '));
      return {
        ok: false as const,
        code: 'oauth_config_incomplete',
        error: '统一身份登录尚未配置完成，请联系平台运维',
        detail: errors.map((e) => `${e.key} —— ${e.detail}`).join('\n'),
        hint: '在 apps/api/.env.oauth 里补齐上述项后重启 API；GET /api/v1/auth/oauth/diagnostics 可复检',
        traceId: trace.id,
      };
    }
    const state = this.states.issue(workspaceId, returnTo, trace.id);
    const url = this.client.authorizeUrl(state, config);
    trace.step('authorize_url', `ws=${workspaceId} returnTo=${returnTo || '(默认首页)'}`);
    return { ok: true as const, url, state, traceId: trace.id };
  }

  logoutUrl() {
    const config = oauthConfig();
    if (config.mode !== 'oauth' || !config.logoutRedirect) return { url: '' };
    return { url: this.client.logoutUrl(config) };
  }

  async handleCallback(input: {
    code: string;
    state: string;
    workspaceId?: string;
    visitorId?: string;
  }): Promise<CallbackSuccess | CallbackFailure> {
    const config = oauthConfig();
    const trace = new OAuthTrace(this.logger);
    const fail = (code: string, error: string, detail: string, hint: string): CallbackFailure => {
      trace.fail(code, detail);
      return { ok: false, code, error, detail, hint, traceId: trace.id, steps: trace.publicSteps() };
    };

    if (config.mode !== 'oauth') {
      return fail(
        'oauth_disabled',
        '当前环境未启用统一身份登录',
        `AUTH_MODE=${config.mode}`,
        '这是账号密码环境，不该走到回调；检查前端是否拿到了过期的登录模式缓存',
      );
    }
    if (!input.code) {
      return fail('oauth_code_missing', '登录参数缺失，请重新登录', '回调没有携带 code', '确认 IDaaS 注册的 redirect_uri 与实际访问地址一致');
    }

    // 1) state：一次性 + TTL，防重放
    const checked = this.states.consume(input.state ?? '');
    if (!checked.ok) {
      const reasonText = {
        missing: 'state 不存在（可能是 API 重启、或多实例部署时落到了另一个实例）',
        used: 'state 已被使用过（重复提交回调，多为刷新回调页导致）',
        expired: `state 已过期（超过 ${Math.round(config.stateTtlMs / 60000)} 分钟）`,
      }[checked.reason];
      return fail(
        'oauth_state_invalid',
        '登录已超时，请重新登录',
        `${reasonText}；本实例 ${this.states.instanceId}，当前待用 state ${this.states.stats().pending} 个`,
        checked.reason === 'missing'
          ? 'API 若刚重启过，重新点一次登录即可；若是多实例部署，需要把 state 换成共享存储'
          : '重新点一次登录',
      );
    }
    const workspaceId = input.workspaceId || checked.entry.workspaceId;
    trace.step('state_ok', `ws=${workspaceId}`);

    // 2) 授权码换 access_token
    const token = await this.client.exchangeCode(input.code, trace, config);
    if (!token.ok) {
      const f = token.failure;
      const detail =
        f.kind === 'upstream'
          ? `IDaaS 返回 ${f.errorCode} ${f.errorDesc}`
          : f.kind === 'network'
            ? `网络层失败：${f.detail}`
            : f.detail;
      return fail('oauth_exchange_failed', '统一身份校验失败，请重试', detail, f.hint);
    }

    // 3) 取用户信息
    const profile = await this.client.fetchUserInfo(token.data.access_token, trace, config);
    if (!profile.ok) {
      const f = profile.failure;
      const detail =
        f.kind === 'upstream'
          ? `IDaaS 返回 ${f.errorCode} ${f.errorDesc}`
          : f.kind === 'network'
            ? `网络层失败：${f.detail}`
            : f.detail;
      return fail('oauth_userinfo_failed', '获取用户信息失败，请重试', detail, f.hint);
    }

    // 4) 字段提取。这一行是内网首次联调最关键的日志：
    //    上游到底给了哪些字段、我们认出了哪几个，一目了然。
    const identity = extractIdentity(profile.data, config);
    trace.step('identity', describeIdentity(identity));
    const email = toEmailCandidate(identity, config.defaultEmailDomain);

    if (!email && !identity.externalId) {
      return fail(
        'oauth_identity_empty',
        '统一身份没有返回可用的账号信息',
        `既没取到邮箱/账号也没取到 uuid。上游字段：${identity.availableKeys.join(',') || '(空)'}`,
        '用 OAUTH_FIELD_EMAIL / OAUTH_FIELD_ACCOUNT / OAUTH_FIELD_EXTERNAL_ID 指定真实字段名后重启；' +
          '若上游确实没配附加属性，需联系 IDaaS 管理员在管理平台补配',
      );
    }

    // 5) 映射到平台成员并签发平台令牌
    const result = await this.docs.loginWithOAuth({
      workspaceId,
      email,
      externalId: identity.externalId,
      name: identity.name,
      postName: identity.postName,
      orgPath: identity.orgPath,
      visitorId: input.visitorId,
      jitProvision: config.jitProvision,
      defaultRole: config.defaultRole,
      allowedEmailDomains: config.allowedEmailDomains,
      sessionTtlHours: config.sessionTtlHours,
    });

    if (!result.ok) {
      return fail(
        result.code,
        result.error,
        result.detail ?? '',
        result.code === 'oauth_identity_unmapped'
          ? '在「组织权限」里把该账号加进成员表，或开 OAUTH_JIT_PROVISION=1 自动建号'
          : '详见 docs/auth-oauth-troubleshooting.md',
      );
    }

    trace.step(
      'login_ok',
      `user=${String(result.user.id)} role=${String(result.user.platformRole)}${result.provisioned ? ' (JIT 新建)' : ''}`,
    );
    return {
      ok: true,
      token: result.token,
      expiresAt: result.expiresAt,
      user: result.user,
      traceId: trace.id,
      provisioned: result.provisioned,
    };
  }

  /**
   * 部署自检。不需要凭据、不需要真人登录，填完配置立刻就能打。
   * 刻意不返回任何 secret 值本身，只回「有没有配 / 格式对不对 / 通不通」。
   */
  async diagnostics(withPing: boolean) {
    const config = oauthConfig();
    const checks: ConfigCheck[] = validateOAuthConfig(config);
    const errors = configErrors(checks);

    let upstream: { ok: boolean; detail: string; ms: number } | null = null;
    if (withPing && config.mode === 'oauth' && config.issuerBase) {
      upstream = await this.client.ping(config);
    }

    const sampleState = 'SAMPLE_STATE_FOR_PREVIEW';
    return {
      mode: config.mode,
      ready: errors.length === 0,
      checks,
      errors: errors.map((item) => `${item.key} —— ${item.detail}`),
      upstream,
      state: this.states.stats(),
      /** 把实际会发出去的授权地址回显出来，方便与 IDaaS 注册值逐字符核对 */
      authorizeUrlSample:
        config.mode === 'oauth' && config.issuerBase && config.clientId
          ? this.client.authorizeUrl(sampleState, config)
          : '',
      logoutUrlSample: config.mode === 'oauth' && config.logoutRedirect ? this.client.logoutUrl(config) : '',
      fieldAliases: config.fieldAliases,
      serverTime: new Date().toISOString(),
    };
  }
}
