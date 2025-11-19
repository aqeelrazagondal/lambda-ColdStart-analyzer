import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BUNDLE_AUDIT_JOB, BUNDLE_AUDIT_QUEUE } from './bundle-audit.constants';

@Injectable()
export class BundleAuditTasksService {
  private readonly logger = new Logger(BundleAuditTasksService.name);
  constructor(@InjectQueue(BUNDLE_AUDIT_QUEUE) private readonly queue: Queue) {}

  async enqueue(uploadId: string) {
    await this.queue.add(
      BUNDLE_AUDIT_JOB,
      { uploadId },
      {
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );
    this.logger.log(`Bundle upload ${uploadId} enqueued for analysis`);
  }
}

