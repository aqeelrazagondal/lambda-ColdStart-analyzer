import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimitService {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || process.env.BUNDLE_AUDIT_QUEUE_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async getStats(orgId?: string) {
    // Get all throttle keys from Redis
    const keys = await this.redis.keys('throttler:*');
    
    let totalRequests = 0;
    let blockedRequests = 0;
    const userStats: Map<string, { requests: number; blocked: number }> = new Map();
    const ipStats: Map<string, { requests: number; blocked: number }> = new Map();

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const count = parseInt(value, 10);
        totalRequests += count;

        // Parse key format: throttler:default:{tracker}:{identifier}
        const parts = key.split(':');
        if (parts.length >= 4) {
          const identifier = parts.slice(3).join(':');
          
          // Check if this is a blocked request (count >= limit)
          const limit = Number(process.env.RATE_LIMIT_DEFAULT || 100);
          if (count >= limit) {
            blockedRequests += 1;
          }

          // Track by user or IP
          if (identifier.startsWith('user:')) {
            const userId = identifier.replace('user:', '');
            const existing = userStats.get(userId) || { requests: 0, blocked: 0 };
            existing.requests += count;
            if (count >= limit) existing.blocked += 1;
            userStats.set(userId, existing);
          } else if (identifier.includes('.')) {
            // Likely an IP address
            const existing = ipStats.get(identifier) || { requests: 0, blocked: 0 };
            existing.requests += count;
            if (count >= limit) existing.blocked += 1;
            ipStats.set(identifier, existing);
          }
        }
      }
    }

    return {
      totalRequests,
      blockedRequests,
      activeUsers: userStats.size,
      activeIPs: ipStats.size,
      topUsers: Array.from(userStats.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
      topIPs: Array.from(ipStats.entries())
        .map(([ip, stats]) => ({ ip, ...stats }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
    };
  }

  async getUserMetrics(userId: string) {
    const keys = await this.redis.keys(`throttler:*:user:${userId}*`);
    let totalRequests = 0;
    let blockedRequests = 0;

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const count = parseInt(value, 10);
        totalRequests += count;
        const limit = Number(process.env.RATE_LIMIT_DEFAULT || 100);
        if (count >= limit) {
          blockedRequests += 1;
        }
      }
    }

    return {
      userId,
      totalRequests,
      blockedRequests,
    };
  }

  async getTimeline(hours: number = 24) {
    // This is a simplified version - in production you'd want to store
    // time-series data separately. For now, we'll return current snapshot.
    const stats = await this.getStats();
    return {
      timestamp: new Date().toISOString(),
      ...stats,
    };
  }

  async getViolations(limit: number = 10) {
    const keys = await this.redis.keys('throttler:*');
    const violations: Array<{ identifier: string; count: number; limit: number }> = [];
    const rateLimit = Number(process.env.RATE_LIMIT_DEFAULT || 100);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const count = parseInt(value, 10);
        if (count >= rateLimit) {
          const parts = key.split(':');
          const identifier = parts.length >= 4 ? parts.slice(3).join(':') : 'unknown';
          violations.push({
            identifier,
            count,
            limit: rateLimit,
          });
        }
      }
    }

    return violations
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

