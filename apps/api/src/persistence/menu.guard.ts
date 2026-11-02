import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { bearerToken } from '../auth/bearer-token';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformDocsService } from './platform-docs.service';
import { canAccessMenu } from './rbac-store';

const REQUIRED_MENU = 'mssclaw:required-menu';

interface MenuRequirement {
  menus: string[];
  edit: boolean;
}

/** 接口要求的菜单权限：传多个菜单时有其中一个就行；edit 要求可编辑。超管全部放行 */
export const RequireMenu = (menus: string | string[], access: 'view' | 'edit' = 'view') =>
  SetMetadata(REQUIRED_MENU, { menus: Array.isArray(menus) ? menus : [menus], edit: access === 'edit' } satisfies MenuRequirement);

export type AuthUser = { id: string; platformRole: string; regionId: string | null; deptIds: string[] } & Record<string, unknown>;

/** MenuGuard 校验通过后放在请求上的当前用户 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().authUser,
);

@Injectable()
export class MenuGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly docs: PlatformDocsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await this.docs.me(bearerToken(request.headers.authorization, request.headers['x-session-token']));
    if (!session.ok) throw new UnauthorizedException(session.error);
    const required = this.reflector.getAllAndOverride<MenuRequirement | undefined>(REQUIRED_MENU, [context.getHandler(), context.getClass()]);
    if (required) {
      const role = session.user.platformRole;
      let allowed = false;
      for (const menuId of required.menus) {
        if (await canAccessMenu(this.prisma, role, menuId, required.edit)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) throw new ForbiddenException(`menu_forbidden:${required.menus.join('|')}${required.edit ? ':edit' : ''}`);
    }
    request.authUser = session.user;
    return true;
  }
}
