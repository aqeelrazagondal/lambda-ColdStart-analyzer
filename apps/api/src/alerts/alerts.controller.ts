import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertsService } from './alerts.service';

@UseGuards(AuthGuard('jwt'))
@Controller('functions/:id/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  async list(@Param('id') functionId: string, @Req() req: any) {
    return this.alerts.listFunctionAlerts(functionId, req.user.userId);
  }
}
