import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { ActivityService } from './activity.service';

@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/activity')
export class ActivityController {
  constructor(private readonly svc: ActivityService) {}

  @Get()
  list(@Param('orgId') orgId: string, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.svc.list(orgId, parsed && parsed > 0 ? parsed : 20);
  }
}
