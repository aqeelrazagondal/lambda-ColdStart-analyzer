import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { METRICS_REFRESH_JOB, METRICS_REFRESH_QUEUE } from './scheduler.constants';
import { SchedulerConfigService } from './scheduler.config.service';
import { MetricsService } from '../metrics/metrics.service';
import { Prisma } from '@prisma/client';

@Processor(METRICS_REFRESH_QUEUE)
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(private readonly config: SchedulerConfigService, private readonly metrics: MetricsService) {}

  @Process(METRICS_REFRESH_JOB)
  async handleMetricsRefresh(job: Job) {
    this.logger.log(`Received metrics refresh trigger (jobId=${job.id})`);
    const schedules = await this.config.listActiveSchedules();
    const defaultRange = process.env.METRICS_REFRESH_RANGE || '7d';

    for (const schedule of schedules) {
      const targetRange = schedule.range || defaultRange;
      const regions = this.extractRegions(schedule.regions);
      for (const region of regions) {
        try {
          await this.metrics.refreshMetricsInternal(schedule.functionId, targetRange, region);
          await this.config.markRunResult(schedule.id, 'success');
        } catch (err: any) {
          const message = err?.message || 'unknown error';
          this.logger.error(`Auto refresh failed`, { scheduleId: schedule.id, region, message } as any);
          await this.config.markRunResult(schedule.id, 'failed', message);
        }
      }
    }
    return { processed: schedules.length };
  }

  private extractRegions(regions: Prisma.JsonValue | null): (string | undefined)[] {
    if (Array.isArray(regions)) {
      const vals = regions.filter((value) => typeof value === 'string') as string[];
      return vals.length ? vals : [undefined];
    }
    if (typeof regions === 'string') {
      return [regions];
    }
    return [undefined];
  }
}

function scheduleFunctionRegion(schedule: any): string {
  const regions = Array.isArray(schedule?.regions) ? schedule.regions : [];
  const first = regions.find((value: any) => typeof value === 'string');
  return (first as string | undefined) || 'default';
}
