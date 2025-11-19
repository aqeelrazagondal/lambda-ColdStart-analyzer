import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [PrismaModule, OrgsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
