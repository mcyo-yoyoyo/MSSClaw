import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EMAIL_MAX_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_RE.test(email)) {
    throw new BadRequestException('invalid_ai_brief_subscription_email');
  }
  return email;
}

function serializeSubscription(row: {
  workspaceId: string;
  userId: string;
  userName: string;
  email: string;
  subscribedAt: Date;
  updatedAt: Date;
}) {
  return {
    workspaceId: row.workspaceId,
    userId: row.userId,
    userName: row.userName,
    email: row.email,
    subscribedAt: row.subscribedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AiBriefSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(workspaceId: string, userId: string) {
    const row = await this.prisma.aiBriefEmailSubscription.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return { subscription: row ? serializeSubscription(row) : null };
  }

  async subscribe(input: {
    workspaceId: string;
    userId: string;
    userName: string;
    email?: string;
  }) {
    const email = normalizeEmail(input.email);
    const userName = input.userName.trim().slice(0, 120) || input.userId;
    const row = await this.prisma.aiBriefEmailSubscription.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.userId,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        userName,
        email,
      },
      update: { userName, email },
    });
    return { subscription: serializeSubscription(row) };
  }

  async unsubscribe(workspaceId: string, userId: string) {
    await this.prisma.aiBriefEmailSubscription.deleteMany({
      where: { workspaceId, userId },
    });
    return { ok: true };
  }

  async list(workspaceId: string) {
    const rows = await this.prisma.aiBriefEmailSubscription.findMany({
      where: { workspaceId },
      orderBy: [{ subscribedAt: 'desc' }, { email: 'asc' }],
    });
    return {
      total: rows.length,
      items: rows.map(serializeSubscription),
    };
  }
}
