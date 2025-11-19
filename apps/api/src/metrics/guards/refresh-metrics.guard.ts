import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

// Simple in-memory rate limiter per userId:functionId key.
// Allows one refresh every WINDOW_MS per key.
@Injectable()
export class RefreshMetricsGuard implements CanActivate {
  private static readonly store: Map<string, number> = new Map(); // key -> nextAllowedEpochMs
  private static readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  static resetStore() {
    RefreshMetricsGuard.store.clear();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();

    const userId: string | undefined = req?.user?.userId;
    const functionId: string | undefined = req?.params?.id;
    if (!userId || !functionId) return true; // let auth/params validation handle missing

    const key = `${userId}:${functionId}`;
    const now = Date.now();
    const nextAllowed = RefreshMetricsGuard.store.get(key) || 0;
    if (now < nextAllowed) {
      const retryAfterMs = nextAllowed - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      // Set Retry-After header
      try { res.setHeader('Retry-After', String(retryAfterSeconds)); } catch {}
      throw new HttpException(
        {
          message: 'Too many requests. Try again later.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Allow and set next window
    RefreshMetricsGuard.store.set(key, now + RefreshMetricsGuard.WINDOW_MS);
    return true;
  }
}
