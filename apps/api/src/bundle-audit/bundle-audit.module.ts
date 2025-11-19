import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BundleAuditController } from './bundle-audit.controller';
import { BundleAuditService } from './bundle-audit.service';
import { BundleStorageService } from './bundle-storage.service';
import { BundleAuditQueueService, BUNDLE_AUDIT_QUEUE } from './bundle-audit.queue';
import { BundleAuditProcessor } from './bundle-audit.processor';
import { BundleAuditAnalysisService } from './bundle-audit.analysis';
import { OrgsModule } from '../orgs/orgs.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    OrgsModule,
    ActivityModule,
    BullModule.registerQueue({
      name: BUNDLE_AUDIT_QUEUE,
    }),
  ],
  controllers: [BundleAuditController],
  providers: [BundleAuditService, BundleStorageService, BundleAuditQueueService, BundleAuditProcessor, BundleAuditAnalysisService],
  exports: [BundleAuditService],
})
export class BundleAuditModule {}
