import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface FunctionsQuery {
  orgId: string;
  region?: string;
  runtime?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class FunctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, params: Omit<FunctionsQuery, 'orgId'>) {
    // Normalize filters
    const region = (params.region || '').trim();
    const runtime = (params.runtime || '').trim();
    const q = (params.q || '').trim();
    // Clamp pagination
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 50));
    const where: any = { orgId };
    if (region.length > 0) where.region = region;
    if (runtime.length > 0) where.runtime = runtime;
    if (q.length > 0) where.functionName = { contains: q, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lambdaFunction.findMany({
        where,
        orderBy: { lastScannedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lambdaFunction.count({ where }),
    ]);
    const hasPrevPage = page > 1;
    const hasNextPage = page * pageSize < total;
    return { items, total, page, pageSize, hasPrevPage, hasNextPage };
  }
}
