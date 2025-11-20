import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';
export interface AuditLogOptions {
  action: string;
  resourceType?: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
}

export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);

