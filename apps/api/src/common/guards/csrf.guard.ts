import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Skip CSRF check for public endpoints that don't need it
    // (e.g., login, register - these use refresh tokens which are stored securely)
    const path = request.path;
    if (path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh')) {
      return true;
    }

    // For SPA, we rely on:
    // 1. SameSite=Strict cookies for refresh tokens
    // 2. CORS configuration to only allow trusted origins
    // 3. JWT tokens in Authorization header (not vulnerable to CSRF)
    
    // Additional CSRF protection: Check for custom header (SPA-specific)
    // Browsers enforce same-origin policy for custom headers
    const csrfToken = request.headers['x-csrf-token'];
    const origin = request.headers.origin || request.headers.referer;

    // In production, validate against allowed origins
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (allowedOrigins.length > 0 && origin) {
      const originUrl = new URL(origin);
      const isAllowed = allowedOrigins.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          return originUrl.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });

      if (!isAllowed) {
        throw new UnauthorizedException('Invalid origin');
      }
    }

    // For now, we rely on CORS and SameSite cookies
    // In a more strict setup, you could require CSRF tokens
    return true;
  }
}

