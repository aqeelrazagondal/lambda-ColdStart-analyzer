import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma.module';
import { ActivityModule } from '../activity/activity.module';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [PrismaModule, ActivityModule, OrgsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
