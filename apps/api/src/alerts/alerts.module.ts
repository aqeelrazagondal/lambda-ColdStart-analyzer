import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, OrgsModule, NotificationsModule],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
