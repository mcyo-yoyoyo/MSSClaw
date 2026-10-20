import { Body, Controller, Delete, Get, Headers, Param, Patch, Put, Query, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersistenceService } from './persistence.service';
import { PlatformDocsService } from './platform-docs.service';
import {
  hideItem,
  listFavorites,
  listHidden,
  listRecent,
  pushRecent,
  setFavorite,
  setFavoriteNote,
} from './personal-data';

/** 当前登录人的个人数据：收藏、最近浏览、隐藏。成员 id 只从会话解析，读写不到别人的。 */
@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly persistence: PersistenceService,
    private readonly docs: PlatformDocsService,
  ) {}

  @Get('market-favorites')
  async favorites(@Headers('authorization') authorization?: string, @Headers('x-session-token') token?: string) {
    return { items: await listFavorites(this.prisma, await this.memberId(authorization, token)) };
  }

  @Put('market-favorites')
  async favorite(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') token?: string,
  ) {
    return setFavorite(this.prisma, this.persistence, await this.memberId(authorization, token), body, true);
  }

  @Delete('market-favorites/:kind/:id')
  async unfavorite(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Query('assetType') assetType?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') token?: string,
  ) {
    return setFavorite(this.prisma, this.persistence, await this.memberId(authorization, token), { kind, id, assetType }, false);
  }

  @Patch('market-favorites')
  async note(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') token?: string,
  ) {
    return setFavoriteNote(this.prisma, await this.memberId(authorization, token), body);
  }

  @Get('market-recent')
  async recent(@Headers('authorization') authorization?: string, @Headers('x-session-token') token?: string) {
    return { items: await listRecent(this.prisma, await this.memberId(authorization, token)) };
  }

  @Put('market-recent')
  async view(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') token?: string,
  ) {
    return pushRecent(this.prisma, await this.memberId(authorization, token), body);
  }

  @Get('market-hidden')
  async hidden(@Headers('authorization') authorization?: string, @Headers('x-session-token') token?: string) {
    return { keys: await listHidden(this.prisma, await this.memberId(authorization, token)) };
  }

  @Put('market-hidden/:kind/:id')
  async hide(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') token?: string,
  ) {
    return hideItem(this.prisma, await this.memberId(authorization, token), { kind, id });
  }

  private async memberId(authorization?: string, xSessionToken?: string): Promise<string> {
    const raw = (authorization ?? '').trim();
    const bearer = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : '';
    const session = await this.docs.me(bearer || (xSessionToken ?? '').trim() || undefined);
    if (!session.ok) throw new UnauthorizedException(session.error || 'login_required');
    return String(session.user.id);
  }
}
