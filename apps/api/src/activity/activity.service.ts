import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface RecordActivityOptions {
  orgId: string;
  userId?: string | null;
  functionId?: string | null;
  type: string;
  message: string;
  payload?: Record<string, any>;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, limit = 20) {
    return this.prisma.teamActivity.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async record(opts: RecordActivityOptions) {
    await this.prisma.teamActivity.create({
      data: {
        orgId: opts.orgId,
        userId: opts.userId || null,
        functionId: opts.functionId || null,
        type: opts.type,
        message: opts.message,
        payload: opts.payload || undefined,
      },
    });
  }
}
