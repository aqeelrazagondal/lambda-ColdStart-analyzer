import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateAwsAccountDto } from './dto/create-aws-account.dto';
import { ScanLambdasDto } from './dto/scan.dto';
import { AwsAccountsService } from './aws-accounts.service';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OrgRoleGuard } from '../orgs/guards/org-role.guard';
import { RolesAllowed } from '../orgs/decorators/roles.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class AwsAccountsController {
  constructor(private readonly svc: AwsAccountsService) {}

  @Post('orgs/:orgId/aws-accounts')
  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @AuditLog({ action: 'aws_account.create', resourceType: 'aws_account', includeRequestBody: true })
  async create(@Req() req: any, @Param('orgId') orgId: string, @Body() dto: CreateAwsAccountDto) {
    const userId = req.user.userId as string;
    const created = await this.svc.create(orgId, userId, dto);
    return created;
  }

  @Get('orgs/:orgId/aws-accounts')
  @UseGuards(OrgMemberGuard)
  async list(@Req() req: any, @Param('orgId') orgId: string) {
    const userId = req.user.userId as string;
    const accounts = await this.svc.list(orgId, userId);
    return { accounts };
  }

  @Post('aws-accounts/:id/test-connection')
  async test(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.svc.testConnection(id, userId);
  }

  @AuditLog({ action: 'aws_account.scan_lambdas', resourceType: 'aws_account', includeRequestBody: true })
  @Post('aws-accounts/:id/scan-lambdas')
  async scan(@Req() req: any, @Param('id') id: string, @Body() dto: ScanLambdasDto) {
    const userId = req.user.userId as string;
    return this.svc.scanLambdas(id, userId, dto.regions);
  }
}
