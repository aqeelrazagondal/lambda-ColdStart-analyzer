import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SchedulerConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultSchedules() {
    const functions = await this.prisma.lambdaFunction.findMany({ select: { id: true, region: true } });
    const existing = await this.prisma.functionRefreshSchedule.findMany({ select: { functionId: true } });
    const existingSet = new Set(existing.map((e) => e.functionId));
    const missing = functions.filter((fn) => !existingSet.has(fn.id));
    if (!missing.length) return;
    await this.prisma.functionRefreshSchedule.createMany({
      data: missing.map((fn) => ({ functionId: fn.id, regions: fn.region ? [fn.region] : undefined } as any)),
      skipDuplicates: true,
    });
  }

  async listActiveSchedules() {
    return this.prisma.functionRefreshSchedule.findMany({
      where: { enabled: true },
      include: { function: { select: { orgId: true } } },
    });
  }

  async markRunResult(scheduleId: string, status: 'success' | 'failed', errorMessage?: string) {
    await this.prisma.functionRefreshSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: status,
        lastRunError: errorMessage ?? null,
      },
    });
  }
}
