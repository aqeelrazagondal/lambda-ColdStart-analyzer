import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BUNDLE_AUDIT_JOB, BUNDLE_AUDIT_QUEUE } from './bundle-audit.constants';

// Re-export for module imports
export { BUNDLE_AUDIT_QUEUE } from './bundle-audit.constants';

export interface BundleAuditJobPayload {
  uploadId: string;
}

@Injectable()
export class BundleAuditQueueService {
  constructor(@InjectQueue(BUNDLE_AUDIT_QUEUE) private readonly queue: Queue<BundleAuditJobPayload>) {}

  async enqueueUpload(uploadId: string) {
    await this.queue.add(
      BUNDLE_AUDIT_JOB,
      { uploadId },
      {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
  }
}

