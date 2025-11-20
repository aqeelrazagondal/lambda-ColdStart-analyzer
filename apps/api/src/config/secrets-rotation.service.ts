import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SecretsManagerClient, UpdateSecretCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SecretsService } from './secrets.service';
import { PrismaService } from '../prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SecretsRotationService {
  private readonly logger = new Logger(SecretsRotationService.name);
  private client: SecretsManagerClient | null = null;
  private readonly useSecretsManager: boolean;

  constructor(
    private secretsService: SecretsService,
    private prisma: PrismaService
  ) {
    this.useSecretsManager =
      !!process.env.AWS_REGION &&
      !!process.env.AWS_SECRETS_MANAGER_ENABLED &&
      process.env.AWS_SECRETS_MANAGER_ENABLED.toLowerCase() === 'true';

    if (this.useSecretsManager) {
      this.client = new SecretsManagerClient({
        region: process.env.AWS_REGION,
      });
      this.logger.log('AWS Secrets Manager enabled for rotation');
    } else {
      this.logger.warn('AWS Secrets Manager disabled - rotation will not work');
    }
  }

  async rotateSecret(secretName: string, userId?: string): Promise<{ success: boolean; message: string }> {
    if (!this.useSecretsManager || !this.client) {
      throw new BadRequestException('Secrets Manager is not enabled');
    }

    try {
      // Generate new secret value
      const newSecret = this.generateSecretValue(secretName);
      
      // Update in AWS Secrets Manager
      await this.client.send(
        new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: newSecret,
        })
      );

      // Clear cache so next fetch gets new value
      this.secretsService.clearCache(secretName);

      // Log rotation
      await this.logRotation(secretName, userId, 'success');

      this.logger.log(`Successfully rotated secret: ${secretName}`);
      return {
        success: true,
        message: `Secret ${secretName} rotated successfully`,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      this.logger.error(`Failed to rotate secret ${secretName}: ${errorMessage}`);
      
      await this.logRotation(secretName, userId, 'failed', errorMessage);

      throw new BadRequestException(`Failed to rotate secret: ${errorMessage}`);
    }
  }

  async getRotationHistory(secretName?: string) {
    const where = secretName ? { secretName } : {};
    return this.prisma.secretRotation.findMany({
      where,
      orderBy: { rotatedAt: 'desc' },
      take: 100,
    });
  }

  private generateSecretValue(secretName: string): string {
    // Generate appropriate secret based on type
    if (secretName.includes('jwt') || secretName.includes('secret')) {
      // JWT secret: 64 bytes hex
      return randomBytes(64).toString('hex');
    } else if (secretName.includes('credentials') || secretName.includes('aws')) {
      // AWS credentials: generate as JSON
      const accessKey = randomBytes(20).toString('base64').replace(/[^A-Za-z0-9]/g, '');
      const secretKey = randomBytes(40).toString('base64');
      return JSON.stringify({
        accessKeyId: `AKIA${accessKey.substring(0, 16)}`,
        secretAccessKey: secretKey,
      });
    } else {
      // Default: random hex string
      return randomBytes(32).toString('hex');
    }
  }

  private async logRotation(
    secretName: string,
    userId: string | undefined,
    status: 'success' | 'failed',
    errorMessage?: string
  ) {
    try {
      await this.prisma.secretRotation.create({
        data: {
          secretName,
          rotatedBy: userId,
          status,
          errorMessage: status === 'failed' ? errorMessage : null,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to log rotation: ${err}`);
    }
  }
}

