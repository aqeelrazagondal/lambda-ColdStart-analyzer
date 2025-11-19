import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';
import { RangeDto } from './dto/range.dto';
import { RegionMetricsDto } from './dto/region-metrics.dto';
import { MetricsBucketDto } from './dto/metrics-bucket.dto';
import { RefreshMetricsGuard } from './guards/refresh-metrics.guard';
import { Response } from 'express';

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

  @Get('metrics/regions')
  async getRegionMetrics(@Param('id') id: string, @Req() req: any, @Query() q: RegionMetricsDto) {
    return this.svc.getRegionSnapshots(id, req.user.userId, q.region, q.range);
  }

  @Get('metrics/buckets')
  async getMetricBuckets(@Param('id') id: string, @Req() req: any, @Query() q: MetricsBucketDto) {
    return this.svc.getMetricBuckets(id, req.user.userId, { region: q.region, range: q.range, buckets: q.buckets });
  }

  @Get('metrics/export.csv')
  async exportCsv(@Param('id') id: string, @Req() req: any, @Res() res: Response, @Query() q: RegionMetricsDto) {
    const csv = await this.svc.generateCsvExport(id, req.user.userId, { range: q.range, region: q.region });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="function-${id}-metrics.csv"`);
    res.send(csv);
  }

  @Get('metrics/export.pdf')
  async exportPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response, @Query() q: RegionMetricsDto) {
    const doc = await this.svc.generatePdfExport(id, req.user.userId, { range: q.range, region: q.region });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="function-${id}-metrics.pdf"`);
    doc.pipe(res);
    doc.end();
  }
  @Get('regions')
  async listRegions(@Param('id') id: string, @Req() req: any) {
    return this.svc.listFunctionRegions(id, req.user.userId);
  }
}
