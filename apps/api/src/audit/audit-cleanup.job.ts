import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditService } from './audit.service';

export const AUDIT_CLEANUP_QUEUE = 'audit-cleanup';
export const AUDIT_CLEANUP_JOB = 'cleanup-old-logs';

@Processor(AUDIT_CLEANUP_QUEUE)
export class AuditCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditCleanupProcessor.name);

  constructor(private readonly auditService: AuditService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Starting audit log cleanup job ${job.id}`);
    
    try {
      const deleted = await this.auditService.cleanupOldLogs();
      this.logger.log(`Audit cleanup completed: deleted ${deleted} log entries`);
      return { deleted };
    } catch (error: any) {
      this.logger.error(`Audit cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

