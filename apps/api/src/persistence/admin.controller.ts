import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, MenuGuard, RequireMenu, type AuthUser } from './menu.guard';
import {
  clearMemberPassword,
  createDictionaryEntry,
  createMember,
  createRole,
  deleteDictionaryEntry,
  deleteMember,
  deleteRole,
  forceLogout,
  importMembers,
  listMembers,
  listMenus,
  listRoles,
  readTaxonomy,
  setMemberPassword,
  setRoleMenus,
  transferSuperAdmin,
  updateDictionaryEntry,
  updateMember,
  updateRole,
} from './rbac-store';
import { listOperationLogs } from './operation-log';

const MEMBERS = 'org-members';
const ROLES = 'org-roles';
const DEPTS = 'org-depts';
const AUDIT = 'org-audit';
const ANY_ORG = [MEMBERS, ROLES, DEPTS];

/** 组织权限：成员、角色、部门（区域与领域）。查看要有对应菜单，增删改要可编辑 */
@Controller('admin')
@UseGuards(MenuGuard)
@RequireMenu(ANY_ORG, 'edit')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @RequireMenu(MEMBERS)
  async users() {
    return { users: await listMembers(this.prisma) };
  }

  @Post('users')
  @RequireMenu(MEMBERS, 'edit')
  createUser(@Body() body: unknown) {
    return createMember(this.prisma, body);
  }

  @Put('users/:id')
  @RequireMenu(MEMBERS, 'edit')
  updateUser(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return updateMember(this.prisma, id, body, user.id);
  }

  @Delete('users/:id')
  @RequireMenu(MEMBERS, 'edit')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await deleteMember(this.prisma, id, user.id);
    return { ok: true };
  }

  @Put('users/:id/password')
  @RequireMenu(MEMBERS, 'edit')
  setPassword(@Param('id') id: string, @Body() body: unknown) {
    return setMemberPassword(this.prisma, id, body);
  }

  @Delete('users/:id/password')
  @RequireMenu(MEMBERS, 'edit')
  clearPassword(@Param('id') id: string) {
    return clearMemberPassword(this.prisma, id);
  }

  /** 整批校验，任何一行有错整批不写，返回逐行错误 */
  @Post('users/import')
  @RequireMenu(MEMBERS, 'edit')
  @HttpCode(200)
  importUsers(@Body() body: unknown) {
    return importMembers(this.prisma, body);
  }

  @Post('users/:id/logout')
  @RequireMenu(MEMBERS, 'edit')
  @HttpCode(200)
  async logoutUser(@Param('id') id: string) {
    await forceLogout(this.prisma, id);
    return { ok: true };
  }

  /** 只有当前超管本人能调，菜单权限不够 */
  @Post('super-admin/transfer')
  @RequireMenu(MEMBERS, 'edit')
  @HttpCode(200)
  async transfer(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return { users: await transferSuperAdmin(this.prisma, user.id, body) };
  }

  @Get('roles')
  @RequireMenu([MEMBERS, ROLES])
  async roles() {
    return { roles: await listRoles(this.prisma) };
  }

  @Post('roles')
  @RequireMenu(ROLES, 'edit')
  createRole(@Body() body: unknown) {
    return createRole(this.prisma, body);
  }

  @Put('roles/:id')
  @RequireMenu(ROLES, 'edit')
  updateRole(@Param('id') id: string, @Body() body: unknown) {
    return updateRole(this.prisma, id, body);
  }

  @Delete('roles/:id')
  @RequireMenu(ROLES, 'edit')
  async deleteRole(@Param('id') id: string) {
    await deleteRole(this.prisma, id);
    return { ok: true };
  }

  @Put('roles/:id/menus')
  @RequireMenu(ROLES, 'edit')
  setRoleMenus(@Param('id') id: string, @Body() body: unknown) {
    return setRoleMenus(this.prisma, id, body);
  }

  @Get('menus')
  @RequireMenu(ROLES)
  async menus() {
    return { menus: await listMenus(this.prisma) };
  }

  /** Skill / Agent / 工具 / 办公场景的增删改。只读。 */
  @Get('operation-logs')
  @RequireMenu(AUDIT)
  async operationLogs(@Query('module') module?: string, @Query('q') query?: string) {
    return { logs: await listOperationLogs(this.prisma, { module, query }) };
  }

  @RequireMenu(ANY_ORG)
  @Get('taxonomy')
  taxonomy() {
    return readTaxonomy(this.prisma, true);
  }

  @Post('regions')
  @RequireMenu(DEPTS, 'edit')
  createRegion(@Body() body: unknown) {
    return createDictionaryEntry(this.prisma, 'region', body);
  }

  @Put('regions/:id')
  @RequireMenu(DEPTS, 'edit')
  updateRegion(@Param('id') id: string, @Body() body: unknown) {
    return updateDictionaryEntry(this.prisma, 'region', id, body);
  }

  @Delete('regions/:id')
  @RequireMenu(DEPTS, 'edit')
  async deleteRegion(@Param('id') id: string) {
    await deleteDictionaryEntry(this.prisma, 'region', id);
    return { ok: true };
  }

  @Post('domains')
  @RequireMenu(DEPTS, 'edit')
  createDomain(@Body() body: unknown) {
    return createDictionaryEntry(this.prisma, 'domain', body);
  }

  @Put('domains/:id')
  @RequireMenu(DEPTS, 'edit')
  updateDomain(@Param('id') id: string, @Body() body: unknown) {
    return updateDictionaryEntry(this.prisma, 'domain', id, body);
  }

  @Delete('domains/:id')
  @RequireMenu(DEPTS, 'edit')
  async deleteDomain(@Param('id') id: string) {
    await deleteDictionaryEntry(this.prisma, 'domain', id);
    return { ok: true };
  }
}

/** 区域 / 领域字典：游客也要看卡片上的区域、领域名称，免登录只读 */
@Controller('org')
export class OrgController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('taxonomy')
  taxonomy() {
    return readTaxonomy(this.prisma);
  }
}
