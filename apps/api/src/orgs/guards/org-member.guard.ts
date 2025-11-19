import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OrgsService } from '../orgs.service';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly orgs: OrgsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId: string } | undefined;
    const params = req.params || {};
    const orgId: string | undefined = params.orgId || params.id;
    if (!user || !orgId) return false;
    await this.orgs.ensureUserInOrg(user.userId, orgId);
    return true;
  }
}
