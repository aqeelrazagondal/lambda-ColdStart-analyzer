import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.dashboardLayout.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(orgId: string, userId: string, dto: CreateDashboardDto) {
    const config = this.parseConfig(dto.config);
    return this.prisma.dashboardLayout.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        config,
        createdById: userId,
      },
    });
  }

  async update(orgId: string, layoutId: string, dto: UpdateDashboardDto) {
    const existing = await this.prisma.dashboardLayout.findFirst({ where: { id: layoutId, orgId } });
    if (!existing) throw new NotFoundException('Dashboard not found');
    return this.prisma.dashboardLayout.update({
      where: { id: layoutId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        config: dto.config ? this.parseConfig(dto.config) : existing.config,
      },
    });
  }

  async remove(orgId: string, layoutId: string) {
    const existing = await this.prisma.dashboardLayout.findFirst({ where: { id: layoutId, orgId } });
    if (!existing) throw new NotFoundException('Dashboard not found');
    await this.prisma.dashboardLayout.delete({ where: { id: layoutId } });
    return { ok: true };
  }

  private parseConfig(raw: string) {
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      throw new BadRequestException('config must be valid JSON string');
    }
  }
}
