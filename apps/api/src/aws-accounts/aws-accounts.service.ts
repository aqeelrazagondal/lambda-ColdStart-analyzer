import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAwsAccountDto } from './dto/create-aws-account.dto';
import { AwsClient } from '@lca/aws-client';

@Injectable()
export class AwsAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateAwsAccountDto) {
    // Ensure user is in org
    const member = await this.prisma.organizationUser.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    if (!['owner', 'admin'].includes(member.role)) throw new ForbiddenException('Admin role required');

    const created = await this.prisma.awsAccount.create({
      data: {
        orgId,
        awsAccountId: dto.awsAccountId,
        roleArn: dto.roleArn,
        externalId: dto.externalId,
        defaultRegion: dto.defaultRegion,
        connectedAt: new Date(),
      },
    });
    return created;
  }

  async list(orgId: string, userId: string) {
    const member = await this.prisma.organizationUser.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    return this.prisma.awsAccount.findMany({ where: { orgId }, orderBy: { connectedAt: 'desc' } });
  }

  async getOwnedAccountOrThrow(id: string, userId: string) {
    const acct = await this.prisma.awsAccount.findUnique({ where: { id } });
    if (!acct) throw new NotFoundException('AWS account connection not found');
    const member = await this.prisma.organizationUser.findUnique({
      where: { orgId_userId: { orgId: acct.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    return acct;
  }

  async testConnection(id: string, userId: string) {
    const acct = await this.getOwnedAccountOrThrow(id, userId);
    try {
      const client = await AwsClient.assumeRole({
        roleArn: acct.roleArn,
        externalId: acct.externalId,
        region: acct.defaultRegion ?? 'us-east-1',
      });
      // lightweight check: attempt to list zero or one page in one region
      const regionChecked = acct.defaultRegion ?? 'us-east-1';
      await client.listLambdaFunctions([regionChecked]);
      return { ok: true, accountId: acct.awsAccountId, regionChecked };
    } catch (e: any) {
      const requestId = e?.$metadata?.requestId || e?.requestId;
      return { ok: false, error: e?.message ?? 'Unknown error', requestId };
    }
  }

  async scanLambdas(id: string, userId: string, regions?: string[]) {
    const acct = await this.getOwnedAccountOrThrow(id, userId);
    const regionsToUse = regions && regions.length > 0 ? regions : (acct.defaultRegion ? [acct.defaultRegion] : []);
    if (regionsToUse.length === 0) throw new Error('No regions provided and no defaultRegion set');
    try {
      const client = await AwsClient.assumeRole({ roleArn: acct.roleArn, externalId: acct.externalId });
      const fns = await client.listLambdaFunctions(regionsToUse);
      let upserted = 0;
      for (const f of fns) {
        await this.prisma.lambdaFunction.upsert({
          where: { orgId_functionArn: { orgId: acct.orgId, functionArn: f.functionArn } },
          create: {
            orgId: acct.orgId,
            awsAccountId: acct.id,
            region: f.region || regionsToUse[0],
            functionArn: f.functionArn,
            functionName: f.functionName,
            runtime: f.runtime,
            memoryMb: f.memorySize ?? undefined,
            timeoutMs: (f.timeout ?? 0) * 1000,
            lastScannedAt: new Date(),
          },
          update: {
            awsAccountId: acct.id,
            region: f.region || regionsToUse[0],
            functionName: f.functionName,
            runtime: f.runtime,
            memoryMb: f.memorySize ?? undefined,
            timeoutMs: (f.timeout ?? 0) * 1000,
            lastScannedAt: new Date(),
          },
        });
        upserted++;
      }
      return { scanned: upserted, regions: regionsToUse };
    } catch (e: any) {
      const requestId = e?.$metadata?.requestId || e?.requestId;
      const err = new Error(`${e?.message ?? 'Scan failed'}${requestId ? ` (requestId=${requestId})` : ''}`);
      (err as any).requestId = requestId;
      throw err;
    }
  }
}
