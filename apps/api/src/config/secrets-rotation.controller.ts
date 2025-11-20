import { Controller, Post, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecretsRotationService } from './secrets-rotation.service';
import { OrgsService } from '../orgs/orgs.service';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('config/secrets')
@UseGuards(AuthGuard('jwt'))
export class SecretsRotationController {
  constructor(
    private readonly rotationService: SecretsRotationService,
    private readonly orgsService: OrgsService
  ) {}

  // Note: Secret rotation is system-wide, but we require user to be admin/owner in at least one org
  @Post('rotate/:secretName')
  @AuditLog({ action: 'secret.rotate', resourceType: 'secret' })
  async rotateSecret(@Param('secretName') secretName: string, @Req() req: any) {
    // Verify user has admin/owner role in at least one org
    const orgs = await this.orgsService.listUserOrgs(req.user.userId);
    const hasAdminAccess = orgs.some((o: any) => ['admin', 'owner'].includes(o.role));
    if (!hasAdminAccess) {
      throw new ForbiddenException('Admin or owner role required');
    }
    return this.rotationService.rotateSecret(secretName, req.user.userId);
  }

  @Get('rotation-status')
  async getRotationStatus(@Req() req: any) {
    // Verify user has admin/owner role in at least one org
    const orgs = await this.orgsService.listUserOrgs(req.user.userId);
    const hasAdminAccess = orgs.some((o: any) => ['admin', 'owner'].includes(o.role));
    if (!hasAdminAccess) {
      throw new ForbiddenException('Admin or owner role required');
    }
    return this.rotationService.getRotationHistory();
  }

  @Get('rotation-status/:secretName')
  async getSecretRotationStatus(@Param('secretName') secretName: string, @Req() req: any) {
    // Verify user has admin/owner role in at least one org
    const orgs = await this.orgsService.listUserOrgs(req.user.userId);
    const hasAdminAccess = orgs.some((o: any) => ['admin', 'owner'].includes(o.role));
    if (!hasAdminAccess) {
      throw new ForbiddenException('Admin or owner role required');
    }
    return this.rotationService.getRotationHistory(secretName);
  }
}

