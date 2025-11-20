import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { ConfigModule } from './config/config.module';
import { AuditModule } from './audit/audit.module';
import { SecretsRotationModule } from './config/secrets-rotation.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: Number(process.env.RATE_LIMIT_DEFAULT || 100), // 100 requests per minute
      },
    ]),
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
    AuditModule,
    SecretsRotationModule,
    RateLimitModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
