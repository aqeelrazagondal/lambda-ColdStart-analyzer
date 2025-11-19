import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(orgId: string, query: string) {
    const trimmed = query?.trim();
    if (!trimmed) return { results: [] };
    const take = 5;

    const [functions, dashboards, bundles, alerts] = await Promise.all([
      this.prisma.lambdaFunction.findMany({
        where: { orgId, functionName: { contains: trimmed, mode: 'insensitive' } },
        take,
      }),
      this.prisma.dashboardLayout.findMany({
        where: { orgId, name: { contains: trimmed, mode: 'insensitive' } },
        take,
      }),
      this.prisma.bundleUpload.findMany({
        where: { orgId, originalFilename: { contains: trimmed, mode: 'insensitive' } },
        take,
        include: { function: true },
      }),
      this.prisma.functionAlert.findMany({
        where: { function: { orgId }, message: { contains: trimmed, mode: 'insensitive' } },
        take,
        include: { function: true },
      }),
    ]);

    const results = [
      ...functions.map((fn) => ({
        id: `function-${fn.id}`,
        label: fn.functionName,
        type: 'Function',
        href: `/orgs/${orgId}/functions/${fn.id}`,
        meta: fn.region,
      })),
      ...dashboards.map((dash) => ({
        id: `dashboard-${dash.id}`,
        label: dash.name,
        type: 'Dashboard',
        href: `/orgs/${orgId}/dashboard#${dash.id}`,
        meta: dash.description || undefined,
      })),
      ...bundles.map((bundle) => ({
        id: `bundle-${bundle.id}`,
        label: bundle.originalFilename,
        type: 'Bundle upload',
        href: `/orgs/${orgId}/bundles`,
        meta: bundle.function?.functionName,
      })),
      ...alerts.map((alert) => ({
        id: `alert-${alert.id}`,
        label: alert.message,
        type: 'Alert',
        href: `/orgs/${orgId}/dashboard#alerts`,
        meta: alert.function?.functionName,
      })),
    ].slice(0, 15);

    return { results };
  }
}

