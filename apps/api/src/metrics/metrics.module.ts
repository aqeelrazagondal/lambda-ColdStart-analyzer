import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { OrgsModule } from '../orgs/orgs.module';
import { RefreshMetricsGuard } from './guards/refresh-metrics.guard';

@Module({
  imports: [OrgsModule],
  providers: [MetricsService, RefreshMetricsGuard],
  controllers: [MetricsController],
})
export class MetricsModule {}
