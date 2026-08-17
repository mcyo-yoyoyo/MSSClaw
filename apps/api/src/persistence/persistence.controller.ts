import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PersistenceService,
  type MarketplacePayload,
  type PortalContentPayload,
} from './persistence.service';
import { BlobStoreService } from './blob-store.service';

const MARKET_ENGAGEMENT_ACTIONS = new Set([
  'view',
  'use',
  'download',
  'favorite',
  'like',
  'dislike',
]);

@Controller('workspaces/:workspaceId')
export class PersistenceController {
  constructor(
    private readonly persistence: PersistenceService,
    private readonly blobs: BlobStoreService,
  ) {}

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

  @Get('inbox/messages')
  getInboxMessages(
    @Param('workspaceId') workspaceId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId_required');
    return this.persistence.getInboxMessages(workspaceId, userId);
  }

  @Post('inbox/messages')
  createInboxMessage(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      id?: string;
      kind?: string;
      title?: string;
      body?: string;
      fromUserId?: string;
      fromName?: string;
      toUserId?: string;
      createdAt?: string;
      meta?: Record<string, unknown>;
    },
  ) {
    if (!body.id || !body.title || !body.body || !body.toUserId) {
      throw new BadRequestException('id_title_body_toUserId_required');
    }
    return this.persistence.createInboxMessage(workspaceId, {
      id: body.id,
      kind: body.kind || 'system',
      title: body.title,
      body: body.body,
      fromUserId: body.fromUserId,
      fromName: body.fromName || '系统',
      toUserId: body.toUserId,
      createdAt: body.createdAt,
      meta: body.meta,
    });
  }

  @Post('inbox/messages/:messageId/read')
  markInboxMessageRead(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @Body() body: { userId?: string },
  ) {
    if (!body.userId) throw new BadRequestException('userId_required');
    return this.persistence.markInboxMessageRead(workspaceId, body.userId, messageId);
  }

  @Post('inbox/read-all')
  markAllInboxMessagesRead(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { userId?: string },
  ) {
    if (!body.userId) throw new BadRequestException('userId_required');
    return this.persistence.markAllInboxMessagesRead(workspaceId, body.userId);
  }

  @Delete('inbox/messages/:messageId')
  deleteInboxMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId_required');
    return this.persistence.deleteInboxMessageForUser(workspaceId, userId, messageId);
  }

  @Get('marketplace')
  getMarketplace(@Param('workspaceId') workspaceId: string) {
    return this.persistence.getMarketplace(workspaceId);
  }

  @Put('marketplace')
  putMarketplace(@Param('workspaceId') workspaceId: string, @Body() body: MarketplacePayload) {
    return this.persistence.putMarketplace(workspaceId, body);
  }

  @Get('market-engagement')
  getMarketEngagement(
    @Param('workspaceId') workspaceId: string,
    @Query('userId') userId = 'anonymous',
  ) {
    return this.persistence.getMarketEngagement(workspaceId, userId);
  }

  @Post('market-engagement/:contentId/actions')
  mutateMarketEngagement(
    @Param('workspaceId') workspaceId: string,
    @Param('contentId') contentId: string,
    @Body()
    body: {
      action?: 'view' | 'use' | 'download' | 'favorite' | 'like' | 'dislike';
      userId?: string;
      active?: boolean;
    },
  ) {
    if (!body?.action || !MARKET_ENGAGEMENT_ACTIONS.has(body.action)) {
      throw new BadRequestException('invalid_market_engagement_action');
    }
    return this.persistence.mutateMarketEngagement(workspaceId, contentId, {
      action: body.action,
      userId: body.userId || 'anonymous',
      active: body.active,
    });
  }

  @Get('portal-content')
  getPortalContent(@Param('workspaceId') workspaceId: string) {
    return this.persistence.getPortalContent(workspaceId);
  }

  @Put('portal-content')
  putPortalContent(
    @Param('workspaceId') workspaceId: string,
    @Body() body: PortalContentPayload,
  ) {
    return this.persistence.putPortalContent(workspaceId, body ?? { items: [] });
  }

  /** 本地磁盘 blob：用 base64 JSON 上传，避免额外 multer 依赖 */
  @Post('blobs')
  async putBlob(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: { name?: string; mimeType?: string; dataBase64?: string },
  ) {
    if (!body?.dataBase64 || !body?.name) {
      throw new BadRequestException('name_and_dataBase64_required');
    }
    try {
      return await this.blobs.putBase64(workspaceId, {
        name: body.name,
        mimeType: body.mimeType,
        dataBase64: body.dataBase64,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'blob_failed';
      throw new BadRequestException(msg);
    }
  }

  @Get('blobs/:blobId')
  @Header('Cache-Control', 'private, max-age=3600')
  async getBlob(
    @Param('workspaceId') workspaceId: string,
    @Param('blobId') blobId: string,
    @Res() res: Response,
  ) {
    const { meta, buffer } = await this.blobs.get(workspaceId, blobId);
    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  }
}
