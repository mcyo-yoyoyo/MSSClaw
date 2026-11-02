import { Controller, Get } from '@nestjs/common';
import { readHomeShowcase } from './home-showcase';
import { PlatformDocsService } from './platform-docs.service';
import { PrismaService } from '../prisma/prisma.service';

/** 首页展示：三栏引用到的资产、公告，以及尚未保存配置时的旧规则材料。 */
@Controller('home')
export class HomeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docs: PlatformDocsService,
  ) {}

  @Get()
  getHome() {
    return readHomeShowcase(this.prisma, this.docs);
  }
}
