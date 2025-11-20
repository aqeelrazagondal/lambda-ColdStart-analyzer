import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgsService } from './orgs.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { OrgMemberGuard } from './guards/org-member.guard';
import { OrgRoleGuard } from './guards/org-role.guard';
import { RolesAllowed } from './decorators/roles.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgs: OrgsService) {}

  @Get()
  async list(@Req() req: any) {
    const userId = req.user.userId as string;
    const orgs = await this.orgs.listUserOrgs(userId);
    return { orgs };
  }

  @AuditLog({ action: 'org.create', resourceType: 'organization', includeRequestBody: true })
  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrgDto) {
    const userId = req.user.userId as string;
    const org = await this.orgs.createOrg(userId, dto.name);
    return { id: org.id, name: org.name, createdAt: org.createdAt };
  }

  @UseGuards(OrgMemberGuard, OrgRoleGuard)
  @RolesAllowed('admin', 'owner')
  @AuditLog({ action: 'org.invite_user', resourceType: 'organization', includeRequestBody: true })
  @Post(':id/invite')
  async invite(@Req() req: any, @Param('id') orgId: string, @Body() dto: InviteUserDto) {
    // Stub: validate membership + role via guards, then return queued response
    return { status: 'queued', email: dto.email, role: dto.role ?? 'viewer', orgId };
  }
}
