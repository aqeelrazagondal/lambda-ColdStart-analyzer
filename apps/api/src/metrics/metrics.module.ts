import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { OrgsModule } from '../orgs/orgs.module';
import { RefreshMetricsGuard } from './guards/refresh-metrics.guard';
import { ActivityModule } from '../activity/activity.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [OrgsModule, ActivityModule, AlertsModule],
  providers: [MetricsService, RefreshMetricsGuard],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
