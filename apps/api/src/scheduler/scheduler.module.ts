import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma.module';
import { SchedulerService } from './scheduler.service';
import { AlertsModule } from '../alerts/alerts.module';
import { MetricsModule } from '../metrics/metrics.module';
import { AuditModule } from '../audit/audit.module';
import { METRICS_REFRESH_QUEUE } from './scheduler.constants';
import { AUDIT_CLEANUP_QUEUE } from '../audit/audit-cleanup.job';
import { SchedulerProcessor } from './scheduler.processor';
import { SchedulerConfigService } from './scheduler.config.service';

@Module({
  imports: [
    PrismaModule,
    MetricsModule,
    AlertsModule,
    AuditModule,
    BullModule.registerQueue({
      name: METRICS_REFRESH_QUEUE,
    }),
    BullModule.registerQueue({
      name: AUDIT_CLEANUP_QUEUE,
    }),
  ],
  providers: [SchedulerService, SchedulerProcessor, SchedulerConfigService],
  exports: [SchedulerService, SchedulerConfigService],
})
export class SchedulerModule {}
