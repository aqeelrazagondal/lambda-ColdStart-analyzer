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

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, OrgsModule, AwsAccountsModule, FunctionsModule, MetricsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
