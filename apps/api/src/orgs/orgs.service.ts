import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserOrgs(userId: string) {
    const memberships = await this.prisma.organizationUser.findMany({
      where: { userId },
      include: { org: true },
      orderBy: { org: { createdAt: 'desc' } },
    });
    return memberships.map((m) => ({
      id: m.orgId,
      name: m.org.name,
      createdAt: m.org.createdAt,
      role: m.role,
    }));
  }

  async createOrg(userId: string, name: string) {
    const org = await this.prisma.organization.create({
      data: { name },
    });
    await this.prisma.organizationUser.create({
      data: { orgId: org.id, userId, role: 'owner' },
    });
    return org;
  }

  async ensureUserInOrg(userId: string, orgId: string) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this organization');
    return membership;
  }

  async ensureUserHasRole(userId: string, orgId: string, allowed: Array<'owner' | 'admin'>) {
    const membership = await this.ensureUserInOrg(userId, orgId);
    if (!allowed.includes(membership.role as any)) {
      throw new ForbiddenException('Insufficient role');
    }
    return membership;
  }

  async getOrgOrThrow(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
