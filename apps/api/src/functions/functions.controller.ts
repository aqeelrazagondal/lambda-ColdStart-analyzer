import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FunctionsService } from './functions.service';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { QueryFunctionsDto } from './dto/query-functions.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/functions')
export class FunctionsController {
  constructor(private readonly svc: FunctionsService) {}

  @UseGuards(OrgMemberGuard)
  @Get()
  async list(@Param('orgId') orgId: string, @Query() query: QueryFunctionsDto) {
    return this.svc.list(orgId, query);
  }
}
