import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExecutionsService } from './executions.service';
import type {
  StreamExecutionDto,
  StreamExecutionRequest,
} from './dto/stream-execution.dto';
import { SseConcurrencyGuard } from '../common/sse-concurrency.guard';
import { PlatformDocsService } from '../persistence/platform-docs.service';

function sessionToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  const alternate = (xSessionToken ?? '').trim();
  return alternate || undefined;
}

@Controller()
export class ExecutionsController {
  constructor(
    private readonly executionsService: ExecutionsService,
    private readonly docs: PlatformDocsService,
  ) {}

  /**
   * 用与聊天完全相同的服务端 SSE 链路探测模型。候选配置只驻留本次请求，
   * 方便“添加模型”先调试再保存；不写入 llm-config，也不返回 Key/响应正文。
   */
  @Post('workspaces/:workspaceId/llm-config/test')
  async testLlmConfig(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);

    if (body != null && (typeof body !== 'object' || Array.isArray(body))) {
      throw new BadRequestException('llm_test_body_must_be_object');
    }
    const input = (body ?? {}) as Record<string, unknown>;

    const hasCandidateField =
      ['baseUrl', 'apiKey'].some((key) => Object.prototype.hasOwnProperty.call(input, key));
    if (hasCandidateField) {
      return this.executionsService.testLlmConnection(workspaceId, undefined, {
        model: input.model,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
      });
    }

    const requestedModel = input.model;
    if (requestedModel !== undefined && typeof requestedModel !== 'string') {
      throw new BadRequestException('model_must_be_string');
    }
    return this.executionsService.testLlmConnection(workspaceId, requestedModel as string | undefined);
  }

  @Get('workspaces/:workspaceId/executions')
  list(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Number(limit) : 50;
    return this.executionsService.list(workspaceId, Number.isFinite(n) ? n : 50);
  }

  @Post('executions/stream')
  @UseGuards(SseConcurrencyGuard)
  async stream(
    @Body() body: StreamExecutionDto,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    if (!body?.chatId || !body?.message) {
      SseConcurrencyGuard.release();
      res.status(400).json({ message: 'chatId and message are required' });
      return;
    }

    const workspaceId = body.workspaceId || 'ws-mss-ai';
    const userId = await this.resolveSessionUserId(workspaceId, authorization, xSessionToken);
    // Build a fresh object so a caller-supplied `userId` (even if added to a future
    // wire DTO) can never become trusted execution identity.
    const execution: StreamExecutionRequest = {
      chatId: body.chatId,
      message: body.message,
      workspaceId,
      model: typeof body.model === 'string' ? body.model.trim() : undefined,
      planSteps: body.planSteps,
      systemPrompt: body.systemPrompt,
      agentName: body.agentName,
      actionType: body.actionType,
      kbContext: body.kbContext,
      assetId: body.assetId,
      assetType: body.assetType,
      userId,
    };

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    req.on('close', onClose);

    try {
      for await (const event of this.executionsService.createStream(execution, abortController.signal)) {
        if (abortController.signal.aborted) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown stream error';
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      }
    } finally {
      req.off('close', onClose);
      SseConcurrencyGuard.release();
      if (!res.writableEnded) res.end();
    }
  }

  private async resolveSessionUserId(
    workspaceId: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<string | undefined> {
    const token = sessionToken(authorization, xSessionToken);
    if (!token) return undefined;
    try {
      const session = await this.docs.me(token, workspaceId);
      if (!session.ok) return undefined;
      const userId = String(session.user?.id ?? '').trim();
      return userId || undefined;
    } catch {
      // Execution remains available to unauthenticated callers; no untrusted
      // identity is attached when session lookup fails.
      return undefined;
    }
  }

  private async requireWorkspaceMember(
    workspaceId: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<Record<string, unknown>> {
    const session = await this.docs.me(sessionToken(authorization, xSessionToken), workspaceId);
    if (!session.ok) {
      throw new UnauthorizedException(session.error || 'platform_docs_login_required');
    }
    return session.user;
  }
}
