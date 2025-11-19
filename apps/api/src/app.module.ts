import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { AwsAccountsModule } from './aws-accounts/aws-accounts.module';
import { FunctionsModule } from './functions/functions.module';
import { MetricsModule } from './metrics/metrics.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BundleAuditModule } from './bundle-audit/bundle-audit.module';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OverviewModule } from './overview/overview.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || process.env.BUNDLE_AUDIT_QUEUE_URL || 'redis://localhost:6379',
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrgsModule,
    AwsAccountsModule,
    FunctionsModule,
    MetricsModule,
    BundleAuditModule,
    SchedulerModule,
    AlertsModule,
    DashboardModule,
    ActivityModule,
    NotificationsModule,
    OverviewModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
