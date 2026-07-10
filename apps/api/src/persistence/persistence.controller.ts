import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PersistenceService, type MarketplacePayload } from './persistence.service';

@Controller('workspaces/:workspaceId')
export class PersistenceController {
  constructor(private readonly persistence: PersistenceService) {}

  @Get('sessions')
  getSessions(@Param('workspaceId') workspaceId: string) {
    return this.persistence.getSessions(workspaceId);
  }

  @Put('sessions')
  putSessions(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { chats: Record<string, unknown> },
  ) {
    return this.persistence.putSessions(workspaceId, body.chats ?? {});
  }

  @Get('marketplace')
  getMarketplace(@Param('workspaceId') workspaceId: string) {
    return this.persistence.getMarketplace(workspaceId);
  }

  @Put('marketplace')
  putMarketplace(@Param('workspaceId') workspaceId: string, @Body() body: MarketplacePayload) {
    return this.persistence.putMarketplace(workspaceId, body);
  }
}
