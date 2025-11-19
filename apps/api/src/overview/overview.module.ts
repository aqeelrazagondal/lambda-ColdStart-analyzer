import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [PrismaModule, OrgsModule],
  providers: [OverviewService],
  controllers: [OverviewController],
})
export class OverviewModule {}

