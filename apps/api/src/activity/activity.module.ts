import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [PrismaModule, OrgsModule],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
