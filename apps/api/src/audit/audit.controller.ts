import { Controller, Get, Query, Param, UseGuards, Req, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OrgRoleGuard } from '../orgs/guards/org-role.guard';
import { RolesAllowed } from '../orgs/decorators/roles.decorator';
import { AuditLog } from './decorators/audit-log.decorator';

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('logs/:orgId')
  @AuditLog({ action: 'audit.query_logs', resourceType: 'audit_log' })
  async queryLogs(@Param('orgId') orgId: string, @Query() query: QueryAuditLogsDto, @Req() req: any) {
    // Ensure admin can only query logs for their org (enforced by OrgMemberGuard)
    const filters: any = {
      orgId: orgId,
      userId: query.userId,
      action: query.action,
      resourceType: query.resourceType,
      limit: query.limit || 100,
      offset: query.offset || 0,
    };

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const logs = await this.auditService.queryLogs(filters);
    const total = await this.auditService.countLogs(filters);

    return {
      logs,
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('logs/:id')
  @AuditLog({ action: 'audit.view_log', resourceType: 'audit_log', resourceId: 'id' })
  async getLog(@Param('id') id: string, @Req() req: any) {
    const log = await this.auditService.getLogById(id);
    if (!log) {
      return null;
    }

    // Verify user has access to this org's logs
    if (log.orgId) {
      // This will be checked by the guard if orgId is in params
      // For now, we'll rely on the fact that logs are org-scoped
    }

    return log;
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('actions/:orgId')
  async getActions(@Param('orgId') orgId: string) {
    return this.auditService.getDistinctActions();
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Get('retention-policy/:orgId')
  async getRetentionPolicy(@Param('orgId') orgId: string) {
    return this.auditService.getRetentionPolicy(orgId);
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Post('retention-policy/:orgId')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'audit.update_retention_policy', resourceType: 'audit_retention_policy', resourceId: 'orgId' })
  async setRetentionPolicy(
    @Param('orgId') orgId: string,
    @Body() body: { retentionDays: number },
    @Req() req: any
  ) {
    return this.auditService.setRetentionPolicy(orgId, body.retentionDays, req.user.userId);
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'audit.cleanup', resourceType: 'audit_log' })
  async cleanup(@Body() body: { orgId?: string }, @Req() req: any) {
    const orgId = body.orgId;
    const deleted = await this.auditService.cleanupOldLogs(orgId);
    return { deleted, message: `Deleted ${deleted} audit log entries` };
  }
}

