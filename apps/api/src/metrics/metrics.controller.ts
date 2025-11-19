import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';
import { RangeDto } from './dto/range.dto';
import { RefreshMetricsGuard } from './guards/refresh-metrics.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('functions/:id')
export class MetricsController {
  constructor(private readonly svc: MetricsService) {}

  @Get('logs-insights-query')
  async getLogsInsightsQuery(@Param('id') id: string, @Req() req: any) {
    // Authorization will occur in service when we fetch the function
    const { fn } = await this.svc.getFunctionAndAuthorize(id, req.user.userId);
    const query = this.svc.buildLogsInsightsQueryString(fn.functionName);
    const logGroupName = `/aws/lambda/${fn.functionName}`;
    return { query, logGroupName };
  }

  @Post('refresh-metrics')
  @UseGuards(RefreshMetricsGuard)
  async refresh(@Param('id') id: string, @Req() req: any, @Query() q: RangeDto) {
    const res = await this.svc.refreshMetrics(id, req.user.userId, q.range);
    return res;
  }

  @Get('metrics')
  async getMetrics(@Param('id') id: string, @Req() req: any, @Query() q: RangeDto) {
    return this.svc.getLatestMetrics(id, req.user.userId, q.range);
  }
}
