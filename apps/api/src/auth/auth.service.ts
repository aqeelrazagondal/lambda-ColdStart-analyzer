import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { SecretsService } from '../config/secrets.service';

@Injectable()
export class AuthService {
  private readonly refreshTokenExpirationDays = 30;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private secretsService: SecretsService
  ) {}

  async register(input: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
    });
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, user.email);
    const session = await this.createSession(user.id, refreshToken.id, ipAddress, userAgent);
    return {
      user: this.publicUser(user),
      accessToken,
      refreshToken: refreshToken.token,
      sessionId: session.id,
    };
  }

  async login(input: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, user.email);
    const session = await this.createSession(user.id, refreshToken.id, ipAddress, userAgent);
    return {
      user: this.publicUser(user),
      accessToken,
      refreshToken: refreshToken.token,
      sessionId: session.id,
    };
  }

  async refresh(refreshTokenString: string, ipAddress?: string, userAgent?: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { user: true, session: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = refreshToken.user;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Token rotation: revoke old token and create new one
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokenPair(user.id, user.email);

    // Update session with new refresh token
    if (refreshToken.session) {
      await this.prisma.session.update({
        where: { id: refreshToken.session.id },
        data: {
          refreshTokenId: newRefreshToken.id,
          lastActivityAt: new Date(),
          ipAddress: ipAddress || refreshToken.session.ipAddress,
          userAgent: userAgent || refreshToken.session.userAgent,
        },
      });
    } else {
      await this.createSession(user.id, newRefreshToken.id, ipAddress, userAgent);
    }

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
    };
  }

  async revokeRefreshToken(token: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken || refreshToken.revokedAt) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    // Also delete associated session
    await this.prisma.session.deleteMany({
      where: { refreshTokenId: refreshToken.id },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      include: {
        refreshToken: {
          select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { refreshToken: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.refreshToken) {
      await this.prisma.refreshToken.update({
        where: { id: session.refreshToken.id },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  private async generateTokenPair(userId: string, email: string) {
    const accessToken = await this.signToken(userId, email);
    const refreshToken = await this.generateRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  private async signToken(userId: string, email: string) {
    return this.jwt.signAsync({ sub: userId, email });
  }

  private async generateRefreshToken(userId: string) {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpirationDays);

    return this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  private async createSession(userId: string, refreshTokenId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenId,
        ipAddress,
        userAgent,
        lastActivityAt: new Date(),
      },
    });
  }

  async getUserSessionsForAdmin(targetUserId: string, adminUserId: string) {
    // Verify admin and target user are in at least one common org
    const adminOrgs = await this.prisma.organizationUser.findMany({
      where: {
        userId: adminUserId,
        role: { in: ['admin', 'owner'] },
      },
      select: { orgId: true },
    });

    const targetOrgs = await this.prisma.organizationUser.findMany({
      where: { userId: targetUserId },
      select: { orgId: true },
    });

    const adminOrgIds = new Set(adminOrgs.map((m) => m.orgId));
    const hasCommonOrg = targetOrgs.some((m) => adminOrgIds.has(m.orgId));

    if (!hasCommonOrg) {
      throw new ForbiddenException('Cannot view sessions for users outside your organization');
    }

    return this.getSessions(targetUserId);
  }

  async revokeSessionByAdmin(sessionId: string, adminUserId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { refreshToken: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Verify admin and session user are in at least one common org
    const adminOrgs = await this.prisma.organizationUser.findMany({
      where: {
        userId: adminUserId,
        role: { in: ['admin', 'owner'] },
      },
      select: { orgId: true },
    });

    const targetOrgs = await this.prisma.organizationUser.findMany({
      where: { userId: session.userId },
      select: { orgId: true },
    });

    const adminOrgIds = new Set(adminOrgs.map((m) => m.orgId));
    const hasCommonOrg = targetOrgs.some((m) => adminOrgIds.has(m.orgId));

    if (!hasCommonOrg) {
      throw new ForbiddenException('Cannot revoke sessions for users outside your organization');
    }

    if (session.refreshToken) {
      await this.prisma.refreshToken.update({
        where: { id: session.refreshToken.id },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  private publicUser(user: { id: string; email: string; name: string | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
