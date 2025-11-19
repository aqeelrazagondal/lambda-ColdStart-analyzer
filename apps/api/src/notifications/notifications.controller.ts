import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { NotificationsService } from './notifications.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateChannelDto) {
    return this.svc.create(orgId, dto);
  }

  @Patch(':channelId')
  update(@Param('orgId') orgId: string, @Param('channelId') channelId: string, @Body() dto: UpdateChannelDto) {
    return this.svc.update(orgId, channelId, dto);
  }

  @Delete(':channelId')
  remove(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.svc.remove(orgId, channelId);
  }
}
