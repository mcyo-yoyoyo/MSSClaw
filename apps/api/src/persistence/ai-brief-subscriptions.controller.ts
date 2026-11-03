import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformDocsService } from './platform-docs.service';
import { AiBriefSubscriptionsService } from './ai-brief-subscriptions.service';
import { assertAnyMenu } from './rbac-store';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（服务层还用它拼 center_record 的记录 id，对应文档迁到正式表时一起去掉）
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
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMine(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    return this.subscriptions.getMine(String(user.id));
  }

  @Post()
  async subscribe(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Body() body: { email?: string },
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    return this.subscriptions.subscribe({
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
    return this.subscriptions.unsubscribe(String(user.id));
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    await assertAnyMenu(this.prisma, String(user.platformRole ?? ''), ['portal-ops']);
    return this.subscriptions.list();
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
