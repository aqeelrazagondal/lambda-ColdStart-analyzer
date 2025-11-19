import { Module } from '@nestjs/common';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';
import { OrgMemberGuard } from './guards/org-member.guard';
import { OrgRoleGuard } from './guards/org-role.guard';

@Module({
  controllers: [OrgsController],
  providers: [OrgsService, OrgMemberGuard, OrgRoleGuard],
  exports: [OrgsService, OrgMemberGuard, OrgRoleGuard],
})
export class OrgsModule {}
