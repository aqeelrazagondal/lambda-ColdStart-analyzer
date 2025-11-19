import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OverviewService } from './overview.service';

@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/overview')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  getOverview(@Param('orgId') orgId: string) {
    return this.overview.get(orgId);
  }
}

