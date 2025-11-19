import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORG_ROLES_KEY, OrgAllowedRole } from '../decorators/roles.decorator';
import { OrgsService } from '../orgs.service';

@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly orgs: OrgsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<OrgAllowedRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed || allowed.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId: string } | undefined;
    const params = req.params || {};
    const orgId: string | undefined = params.orgId || params.id;
    if (!user || !orgId) return false;
    await this.orgs.ensureUserHasRole(user.userId, orgId, allowed);
    return true;
  }
}
