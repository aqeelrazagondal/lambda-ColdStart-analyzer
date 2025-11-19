import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { SearchService } from './search.service';

@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  searchOrg(@Param('orgId') orgId: string, @Query('q') q = '') {
    return this.search.search(orgId, q);
  }
}

