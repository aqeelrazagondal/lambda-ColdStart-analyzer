import { InjectQueue, Process, Processor } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { BundleAuditAnalysisService } from './bundle-audit.analysis';

export const BUNDLE_AUDIT_QUEUE = 'bundle-audit';
const JOB_NAME = 'process-upload';

export interface BundleAuditJobPayload {
  uploadId: string;
}

@Injectable()
export class BundleAuditQueueService {
  constructor(@InjectQueue(BUNDLE_AUDIT_QUEUE) private readonly queue: Queue<BundleAuditJobPayload>) {}

  async enqueueUpload(uploadId: string) {
    await this.queue.add(
      JOB_NAME,
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

@Processor(BUNDLE_AUDIT_QUEUE)
export class BundleAuditProcessor {
  private readonly logger = new Logger(BundleAuditProcessor.name);

  constructor(private readonly analysis: BundleAuditAnalysisService) {}

  @Process(JOB_NAME)
  async handle(job: Job<BundleAuditJobPayload>) {
    this.logger.log(`Processing bundle upload ${job.data.uploadId}`);
    await this.analysis.processUpload(job.data.uploadId);
  }
}

