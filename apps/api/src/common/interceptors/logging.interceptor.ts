import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PiiRedactor } from '../utils/pii-redactor.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, headers } = request;
    const user = request.user;
    const startTime = Date.now();

    // Skip detailed logging for health checks
    if (url.includes('/health')) {
      return next.handle();
    }

    // Extract IP address
    const ipAddress =
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress;

    // Redact sensitive information
    const redactedBody = body ? PiiRedactor.redactObject(body, {
      redactEmails: true,
      redactPasswords: true,
      redactIpAddresses: false, // IP is logged separately
      redactAwsAccountIds: true,
      redactUserIds: false,
    }) : undefined;

    const redactedQuery = query ? PiiRedactor.redactQueryParams(query) : undefined;
    const redactedHeaders = PiiRedactor.redactHeaders(headers);

    // Generate correlation ID if not present
    const correlationId = headers['x-correlation-id'] || this.generateCorrelationId();
    response.setHeader('X-Correlation-ID', correlationId);

    // Log request
    const logData = {
      correlationId,
      method,
      url,
      ipAddress: ipAddress ? PiiRedactor.redactIpAddress(ipAddress) : undefined,
      userId: user?.userId,
      query: redactedQuery,
      body: redactedBody,
      headers: redactedHeaders,
      userAgent: headers['user-agent'],
    };

    this.logger.log(JSON.stringify({
      ...logData,
      type: 'request',
      timestamp: new Date().toISOString(),
    }));

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const logLevel = response.statusCode >= 400 ? 'error' : response.statusCode >= 300 ? 'warn' : 'log';
          
          const responseLog = {
            correlationId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            ipAddress: ipAddress ? PiiRedactor.redactIpAddress(ipAddress) : undefined,
            userId: user?.userId,
            timestamp: new Date().toISOString(),
            type: 'response',
          };

          this.logger[logLevel](JSON.stringify(responseLog));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const responseLog = {
            correlationId,
            method,
            url,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            ipAddress: ipAddress ? PiiRedactor.redactIpAddress(ipAddress) : undefined,
            userId: user?.userId,
            error: error.message,
            timestamp: new Date().toISOString(),
            type: 'error',
          };

          this.logger.error(JSON.stringify(responseLog));
        },
      }),
    );
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

