import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureSuperAdmin } from './rbac-store';

/** 启动时按 SUPER_ADMIN_EMAIL 确定唯一超管；没配时只在库里也没有超管时告警 */
@Injectable()
export class IdentityBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger('IdentityBootstrap');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await ensureSuperAdmin(this.prisma, {
      email: process.env.SUPER_ADMIN_EMAIL,
      name: process.env.SUPER_ADMIN_NAME,
      password: process.env.SUPER_ADMIN_PASSWORD,
    });
    if (!result) {
      if (!(await this.prisma.member.count({ where: { roleId: 'super_admin' } }))) {
        this.logger.warn('没有超级管理员：在 .env 配置 SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD 后重启');
      }
      return;
    }
    if (result.created) this.logger.log(`已创建超级管理员 ${result.memberId}`);
    if (result.passwordSet) this.logger.log('已按 SUPER_ADMIN_PASSWORD 设置超级管理员初始密码');
    for (const email of result.demoted) this.logger.warn(`${email} 不再是超级管理员，已改为能力开发`);
  }
}
