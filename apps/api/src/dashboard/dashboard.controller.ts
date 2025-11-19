import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/dashboards')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Req() req: any, @Body() dto: CreateDashboardDto) {
    const userId = req.user?.userId as string;
    return this.svc.create(orgId, userId, dto);
  }

  @Put(':dashboardId')
  update(@Param('orgId') orgId: string, @Param('dashboardId') dashboardId: string, @Body() dto: UpdateDashboardDto) {
    return this.svc.update(orgId, dashboardId, dto);
  }

  @Delete(':dashboardId')
  remove(@Param('orgId') orgId: string, @Param('dashboardId') dashboardId: string) {
    return this.svc.remove(orgId, dashboardId);
  }
}
