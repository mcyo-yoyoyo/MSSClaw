import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AI_NEWS_SOURCE, AiNewsArchiveService } from './ai-news-archive.service';
import { PlatformDocsService } from './platform-docs.service';

/**
 * AI 快讯：读数据库归档，不再每次访问都代理上游。
 * 上游拉取由 AiNewsArchiveService 每天 08:00 定时执行。
 */
@Controller('ai-daily-news')
export class AiDailyNewsController {
  constructor(
    private readonly archive: AiNewsArchiveService,
    private readonly docs: PlatformDocsService,
  ) {}

  @Get()
  // 读库很快，仍留短缓存削平并发；内容按天更新，无需更长
  @Header('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  async fetchDaily() {
    const payload = await this.archive.readGrouped();
    if (!payload.groups.length) {
      return {
        error: payload.lastSyncError
          ? `archive empty (last sync: ${payload.lastSyncError})`
          : 'archive empty',
        groups: [],
        sourceUrl: AI_NEWS_SOURCE,
      };
    }
    return payload;
  }

  /** 运营手动补拉：内网断网恢复后不必等到次日 08:00 */
  @Post('sync')
  async syncNow(
    @Query('workspaceId') workspaceId = 'ws-mss-ai',
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    const session = await this.docs.me(
      bearerToken(authorization, xSessionToken),
      workspaceId,
    );
    if (!session.ok) {
      throw new UnauthorizedException(session.error || 'ai_news_sync_login_required');
    }
    if (String(session.user.platformRole ?? '') !== 'super_admin') {
      throw new ForbiddenException('ai_news_sync_admin_required');
    }
    return this.archive.syncNow();
  }
}

function bearerToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  return (xSessionToken ?? '').trim() || undefined;
}
