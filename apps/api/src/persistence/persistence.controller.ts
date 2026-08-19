import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  PersistenceService,
  type MarketplacePayload,
  type PortalContentPayload,
} from './persistence.service';
import { BlobStoreService, packageArchiveMimeType } from './blob-store.service';

const MARKET_ENGAGEMENT_ACTIONS = new Set([
  'view',
  'use',
  'download',
  'favorite',
  'like',
  'dislike',
]);

const UNSAFE_INLINE_MIME_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
  'image/svg+xml',
  'text/ecmascript',
  'text/html',
  'text/javascript',
  'text/xml',
]);

function isUnsafeInlineMimeType(value: string): boolean {
  const mimeType = value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return UNSAFE_INLINE_MIME_TYPES.has(mimeType);
}

@Controller('workspaces/:workspaceId')
export class PersistenceController {
  private readonly logger = new Logger(PersistenceController.name);

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

  /** Skill / Agent 原包：直接流式写盘，避免 200MiB 文件的 base64 膨胀与内存复制。 */
  @Post('blobs/packages')
  async putPackageBlob(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ) {
    const encodedName = req.header('x-file-name')?.trim();
    if (!encodedName) throw new BadRequestException('x_file_name_required');

    let name: string;
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      throw new BadRequestException('invalid_x_file_name');
    }
    if (!name.trim()) throw new BadRequestException('x_file_name_required');

    const contentLengthHeader = req.header('content-length');
    let contentLength: number | undefined;
    if (contentLengthHeader !== undefined) {
      if (!/^\d+$/.test(contentLengthHeader)) {
        throw new BadRequestException('invalid_content_length');
      }
      contentLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(contentLength)) {
        throw new BadRequestException('invalid_content_length');
      }
    }

    try {
      return await this.blobs.putPackageStream(workspaceId, {
        name,
        stream: req,
        contentLength,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'package_blob_failed';
      if (msg.startsWith('package_blob_too_large:')) {
        throw new PayloadTooLargeException(msg);
      }
      if (msg === 'empty_blob' || msg === 'unsupported_package_type') {
        throw new BadRequestException(msg);
      }
      this.logger.error(
        'Package blob upload failed',
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException('package_blob_failed');
    }
  }

  @Delete('blobs/:blobId')
  async deleteBlob(
    @Param('workspaceId') workspaceId: string,
    @Param('blobId') blobId: string,
    @Req() req: Request,
  ) {
    try {
      await this.blobs.delete(
        workspaceId,
        blobId,
        req.header('x-blob-delete-token')?.trim(),
      );
      return { ok: true, id: blobId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'blob_delete_failed';
      if (msg === 'invalid_blob_id') throw new BadRequestException(msg);
      if (msg === 'blob_not_found' || msg === 'blob_delete_denied') {
        throw new NotFoundException('blob_not_found');
      }
      this.logger.error(
        'Blob deletion failed',
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException('blob_delete_failed');
    }
  }

  @Get('blobs/:blobId')
  @Header('Cache-Control', 'private, max-age=3600')
  async getBlob(
    @Param('workspaceId') workspaceId: string,
    @Param('blobId') blobId: string,
    @Res() res: Response,
  ) {
    const { meta, size, stream } = await this.blobs.get(workspaceId, blobId);
    const storedMimeType = meta.mimeType || 'application/octet-stream';
    const archiveMimeType = packageArchiveMimeType(meta.name);
    const unsafeInline = isUnsafeInlineMimeType(storedMimeType);
    const forceDownload = Boolean(archiveMimeType) || unsafeInline;
    res.setHeader(
      'Content-Type',
      archiveMimeType || (unsafeInline ? 'application/octet-stream' : storedMimeType),
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${forceDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
    );
    res.setHeader('Content-Length', String(size));
    stream.on('error', (err) => res.destroy(err));
    stream.pipe(res);
  }
}
