import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { bearerToken } from '../auth/bearer-token';
import { PrismaService } from '../prisma/prisma.service';
import { catalogResource, PersistenceService, type CatalogViewer } from './persistence.service';
import { PlatformDocsService } from './platform-docs.service';
import { operationActorFrom } from './operation-log';
import { canAccessMenu } from './rbac-store';

/**
 * 目录单条接口。列表只返回这一类资产；新建、修改、删除只动地址指向的那一条。
 * Skill 与工具和 Agent、知识文档、自动化使用同一套增删改查。
 * 读：游客可读，Skill / Agent 按登录人的区域、领域过滤。写：要登录且有这一类的配置菜单。
 */
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly persistence: PersistenceService,
    private readonly docs: PlatformDocsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':resource')
  async list(
    @Param('resource') resource: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    return this.persistence.listCatalog(resource, await this.viewer(authorization, xSessionToken));
  }

  @Post(':resource')
  async create(
    @Param('resource') resource: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    const user = await this.requireWriter(resource, authorization, xSessionToken);
    return this.persistence.createCatalogItem(resource, body, operationActorFrom(user));
  }

  @Get(':resource/:id')
  async getOne(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    return this.persistence.getCatalogItem(resource, id, await this.viewer(authorization, xSessionToken));
  }

  @Put(':resource/:id')
  async update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    const user = await this.requireWriter(resource, authorization, xSessionToken);
    return this.persistence.updateCatalogItem(resource, id, body, operationActorFrom(user));
  }

  @Delete(':resource/:id')
  async remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    const user = await this.requireWriter(resource, authorization, xSessionToken);
    return this.persistence.deleteCatalogItem(resource, id, operationActorFrom(user));
  }

  /** 没带令牌按游客处理；带了但无效同样 401，避免前端拿着过期令牌静默看到游客数据 */
  private async viewer(authorization?: string, xSessionToken?: string): Promise<CatalogViewer> {
    const token = bearerToken(authorization, xSessionToken);
    if (!token) return null;
    const session = await this.docs.me(token);
    if (!session.ok) throw new UnauthorizedException(session.error);
    return session.user;
  }

  private async requireWriter(resource: string, authorization?: string, xSessionToken?: string) {
    const { writeMenu } = catalogResource(resource);
    const user = await this.viewer(authorization, xSessionToken);
    if (!user) throw new UnauthorizedException('unauthorized');
    if (!(await canAccessMenu(this.prisma, user.platformRole, writeMenu, true))) {
      throw new ForbiddenException(`menu_forbidden:${writeMenu}`);
    }
    return user;
  }
}
