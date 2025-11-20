import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditCleanupProcessor, AUDIT_CLEANUP_QUEUE } from './audit-cleanup.job';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [
    PrismaModule,
    OrgsModule,
    BullModule.registerQueue({
      name: AUDIT_CLEANUP_QUEUE,
    }),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditCleanupProcessor],
  exports: [AuditService],
})
export class AuditModule {}

