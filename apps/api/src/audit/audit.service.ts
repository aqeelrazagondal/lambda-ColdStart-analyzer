import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface AuditLogData {
  userId?: string;
  orgId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  requestBody?: any;
  responseStatus?: number;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestMethod: data.requestMethod,
          requestPath: data.requestPath,
          requestBody: data.requestBody ? JSON.parse(JSON.stringify(data.requestBody)) : null,
          responseStatus: data.responseStatus,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        },
      });
    } catch (err) {
      // Don't throw - audit logging should not break the application
      console.error('Failed to write audit log:', err);
    }
  }

  async queryLogs(filters: {
    userId?: string;
    orgId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.orgId) {
      where.orgId = filters.orgId;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  async countLogs(filters: {
    userId?: string;
    orgId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.orgId) {
      where.orgId = filters.orgId;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.count({ where });
  }

  async getLogById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  async getDistinctActions() {
    const logs = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return logs.map((log) => log.action);
  }

  async getRetentionPolicy(orgId: string) {
    const policy = await this.prisma.auditRetentionPolicy.findUnique({
      where: { orgId },
    });
    if (!policy) {
      // Return default policy
      return { orgId, retentionDays: 90 };
    }
    return policy;
  }

  async setRetentionPolicy(orgId: string, retentionDays: number, userId?: string) {
    return this.prisma.auditRetentionPolicy.upsert({
      where: { orgId },
      update: { retentionDays, updatedAt: new Date() },
      create: {
        orgId,
        retentionDays,
      },
    });
  }

  async cleanupOldLogs(orgId?: string): Promise<number> {
    const policies = orgId
      ? [await this.prisma.auditRetentionPolicy.findUnique({ where: { orgId } })]
      : await this.prisma.auditRetentionPolicy.findMany();

    let totalDeleted = 0;

    if (orgId) {
      const policy = policies[0];
      const retentionDays = policy?.retentionDays || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          orgId,
          createdAt: { lt: cutoffDate },
        },
      });
      totalDeleted = result.count;
    } else {
      // Cleanup for all orgs
      for (const policy of policies) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        const result = await this.prisma.auditLog.deleteMany({
          where: {
            orgId: policy.orgId,
            createdAt: { lt: cutoffDate },
          },
        });
        totalDeleted += result.count;
      }

      // Cleanup logs without org (system logs) with default 90 days
      const defaultCutoff = new Date();
      defaultCutoff.setDate(defaultCutoff.getDate() - 90);
      const systemResult = await this.prisma.auditLog.deleteMany({
        where: {
          orgId: null,
          createdAt: { lt: defaultCutoff },
        },
      });
      totalDeleted += systemResult.count;
    }

    return totalDeleted;
  }
}

