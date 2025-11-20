import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { METRICS_REFRESH_JOB, METRICS_REFRESH_QUEUE } from './scheduler.constants';
import { SchedulerConfigService } from './scheduler.config.service';
import { AUDIT_CLEANUP_JOB, AUDIT_CLEANUP_QUEUE } from '../audit/audit-cleanup.job';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly cronExpression = process.env.METRICS_REFRESH_CRON || '0 3 * * *';
  private readonly timezone = process.env.METRICS_REFRESH_TZ || 'UTC';
  private readonly disabled = process.env.DISABLE_METRICS_CRON === 'true';

  constructor(
    @InjectQueue(METRICS_REFRESH_QUEUE) private readonly queue: Queue,
    @InjectQueue(AUDIT_CLEANUP_QUEUE) private readonly auditCleanupQueue: Queue,
    private readonly config: SchedulerConfigService
  ) {}

  async onModuleInit() {
    if (this.disabled) {
      this.logger.warn('Metrics refresh cron disabled via DISABLE_METRICS_CRON=true');
      return;
    }

    await this.registerRepeatableJob();
    await this.registerAuditCleanupJob();
    await this.config.ensureDefaultSchedules();
    const schedules = await this.config.listActiveSchedules();
    this.logger.log(`Loaded ${schedules.length} active refresh schedules`);
  }

  private async registerRepeatableJob() {
    this.logger.log(`Registering metrics refresh cron (${this.cronExpression} ${this.timezone})`);
    await this.queue.add(
      METRICS_REFRESH_JOB,
      {},
      {
        priority: 1,
        removeOnComplete: true,
        removeOnFail: false,
        repeat: {
          cron: this.cronExpression,
          tz: this.timezone,
        },
      }
    );
  }

  private async registerAuditCleanupJob() {
    const cleanupCron = process.env.AUDIT_CLEANUP_CRON || '0 2 * * *'; // Daily at 2 AM
    const cleanupTz = process.env.AUDIT_CLEANUP_TZ || 'UTC';
    this.logger.log(`Registering audit cleanup cron (${cleanupCron} ${cleanupTz})`);
    await this.auditCleanupQueue.add(
      AUDIT_CLEANUP_JOB,
      {},
      {
        priority: 1,
        removeOnComplete: true,
        removeOnFail: false,
        repeat: {
          cron: cleanupCron,
          tz: cleanupTz,
        },
      }
    );
  }
}
