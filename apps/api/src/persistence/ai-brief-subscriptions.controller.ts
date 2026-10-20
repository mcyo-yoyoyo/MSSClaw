import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';
import { AiBriefSubscriptionsService } from './ai-brief-subscriptions.service';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（第 2 期随服务层一起去掉）
import { PLATFORM_WORKSPACE_ID as workspaceId } from '../common/platform-workspace';

function sessionToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  return (xSessionToken ?? '').trim() || undefined;
}

@Controller('ai-brief/subscriptions')
export class AiBriefSubscriptionsController {
  constructor(
    private readonly subscriptions: AiBriefSubscriptionsService,
    private readonly docs: PlatformDocsService,
  ) {}

  @Get('me')
  async getMine(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    return this.subscriptions.getMine(workspaceId, String(user.id));
  }

  @Post()
  async subscribe(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Body() body: { email?: string },
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    return this.subscriptions.subscribe({
      workspaceId,
      userId: String(user.id),
      userName: String(user.name ?? user.email ?? user.id),
      email: body?.email,
    });
  }

  @Delete('me')
  async unsubscribe(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    return this.subscriptions.unsubscribe(workspaceId, String(user.id));
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    if (String(user.platformRole ?? '') !== 'super_admin') {
      throw new ForbiddenException('ai_brief_subscriptions_admin_required');
    }
    return this.subscriptions.list(workspaceId);
  }

  private async requireSession(
    workspaceId: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<Record<string, unknown>> {
    const session = await this.docs.me(
      sessionToken(authorization, xSessionToken),
      workspaceId,
    );
    if (!session.ok) {
      throw new UnauthorizedException(session.error || 'ai_brief_subscription_login_required');
    }
    return session.user;
  }
}
