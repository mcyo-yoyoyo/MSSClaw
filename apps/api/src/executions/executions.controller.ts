import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExecutionsService } from './executions.service';
import type { StreamExecutionDto } from './dto/stream-execution.dto';
import { SseConcurrencyGuard } from '../common/sse-concurrency.guard';

@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('stream')
  @UseGuards(SseConcurrencyGuard)
  async stream(@Body() body: StreamExecutionDto, @Req() req: Request, @Res() res: Response) {
    if (!body?.chatId || !body?.message) {
      SseConcurrencyGuard.release();
      res.status(400).json({ message: 'chatId and message are required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    req.on('close', onClose);

    try {
      for await (const event of this.executionsService.createStream(body, abortController.signal)) {
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
}
