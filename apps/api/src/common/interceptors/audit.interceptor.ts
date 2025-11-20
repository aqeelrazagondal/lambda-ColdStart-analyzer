import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from '../../audit/decorators/audit-log.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_KEY,
      [handler, controller],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const user = request.user;
    const method = request.method;
    const path = request.path;
    const ipAddress =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Extract orgId from request if available
    let orgId: string | undefined;
    if (request.params?.orgId) {
      orgId = request.params.orgId;
    } else if (request.body?.orgId) {
      orgId = request.body.orgId;
    }

    // Get resource ID from params or body
    let resourceId: string | undefined;
    if (request.params?.id) {
      resourceId = request.params.id;
    } else if (request.body?.id) {
      resourceId = request.body.id;
    }

    // Prepare request body (redacted if needed)
    let requestBody: any = undefined;
    if (auditOptions.includeRequestBody && request.body) {
      requestBody = { ...request.body };
      // Redact sensitive fields
      if (requestBody.password) {
        requestBody.password = '[REDACTED]';
      }
      if (requestBody.passwordHash) {
        requestBody.passwordHash = '[REDACTED]';
      }
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log after successful response
          this.auditService.log({
            userId: user?.userId,
            orgId,
            action: auditOptions.action,
            resourceType: auditOptions.resourceType,
            resourceId,
            ipAddress,
            userAgent,
            requestMethod: method,
            requestPath: path,
            requestBody,
            responseStatus: response.statusCode,
            metadata: auditOptions.includeResponseBody ? { response: data } : undefined,
          });
        },
        error: (error) => {
          // Log errors too
          this.auditService.log({
            userId: user?.userId,
            orgId,
            action: auditOptions.action,
            resourceType: auditOptions.resourceType,
            resourceId,
            ipAddress,
            userAgent,
            requestMethod: method,
            requestPath: path,
            requestBody,
            responseStatus: error.status || 500,
            metadata: { error: error.message },
          });
        },
      }),
    );
  }
}

