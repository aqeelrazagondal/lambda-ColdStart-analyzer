import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RateLimitService } from './rate-limit.service';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OrgRoleGuard } from '../orgs/guards/org-role.guard';
import { RolesAllowed } from '../orgs/decorators/roles.decorator';

@Controller('rate-limit')
@UseGuards(AuthGuard('jwt'))
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('stats/:orgId')
  async getStats(@Param('orgId') orgId: string) {
    return this.rateLimitService.getStats(orgId);
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('users/:userId')
  async getUserMetrics(@Param('userId') userId: string) {
    return this.rateLimitService.getUserMetrics(userId);
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('timeline/:orgId')
  async getTimeline(@Param('orgId') orgId: string, @Query('hours') hours?: string) {
    return this.rateLimitService.getTimeline(hours ? parseInt(hours, 10) : 24);
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('violations/:orgId')
  async getViolations(@Param('orgId') orgId: string, @Query('limit') limit?: string) {
    return this.rateLimitService.getViolations(limit ? parseInt(limit, 10) : 10);
  }
}

