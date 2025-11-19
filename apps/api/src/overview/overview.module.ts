import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';

@Module({
  imports: [PrismaModule],
  providers: [OverviewService],
  controllers: [OverviewController],
})
export class OverviewModule {}

