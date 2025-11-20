import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SecretCache {
  value: any;
  expiresAt: number;
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private client: SecretsManagerClient | null = null;
  private cache: Map<string, SecretCache> = new Map();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes
  private readonly useSecretsManager: boolean;

  constructor() {
    // Only use Secrets Manager if AWS region and secret names are configured
    this.useSecretsManager =
      !!process.env.AWS_REGION &&
      !!process.env.AWS_SECRETS_MANAGER_ENABLED &&
      process.env.AWS_SECRETS_MANAGER_ENABLED.toLowerCase() === 'true';

    if (this.useSecretsManager) {
      this.client = new SecretsManagerClient({
        region: process.env.AWS_REGION,
      });
      this.logger.log('AWS Secrets Manager enabled');
    } else {
      this.logger.log('AWS Secrets Manager disabled, using environment variables');
    }
  }

  async onModuleInit() {
    // Pre-fetch secrets on startup if enabled
    if (this.useSecretsManager) {
      const secretsToPreload = [
        process.env.JWT_SECRET_NAME,
        process.env.JWT_REFRESH_SECRET_NAME,
      ].filter(Boolean) as string[];

      for (const secretName of secretsToPreload) {
        try {
          await this.getSecret(secretName);
        } catch (err) {
          this.logger.warn(`Failed to preload secret ${secretName}: ${err}`);
        }
      }
    }
  }

  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Try Secrets Manager first
    if (this.useSecretsManager && this.client) {
      try {
        const value = await this.fetchFromSecretsManager(secretName);
        this.cache.set(secretName, {
          value,
          expiresAt: Date.now() + this.cacheTtl,
        });
        return value;
      } catch (err) {
        this.logger.warn(`Failed to fetch ${secretName} from Secrets Manager: ${err}`);
        // Fall through to environment variable
      }
    }

    // Fallback to environment variable
    const envKey = this.secretNameToEnvKey(secretName);
    const envValue = process.env[envKey];
    if (!envValue) {
      throw new Error(`Secret ${secretName} not found in Secrets Manager or environment variable ${envKey}`);
    }

    this.cache.set(secretName, {
      value: envValue,
      expiresAt: Date.now() + this.cacheTtl,
    });

    return envValue;
  }

  async getSecretJson<T = any>(secretName: string): Promise<T> {
    const value = await this.getSecret(secretName);
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new Error(`Secret ${secretName} is not valid JSON`);
    }
  }

  private async fetchFromSecretsManager(secretName: string): Promise<string> {
    if (!this.client) {
      throw new Error('Secrets Manager client not initialized');
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (response.SecretString) {
        return response.SecretString;
      }

      if (response.SecretBinary) {
        return Buffer.from(response.SecretBinary).toString('utf-8');
      }

      throw new Error(`Secret ${secretName} has no value`);
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        throw new Error(`Secret ${secretName} not found in Secrets Manager`);
      }
      throw err;
    }
  }

  private secretNameToEnvKey(secretName: string): string {
    // Convert secret name to environment variable key
    // e.g., "lca/jwt-secret" -> "JWT_SECRET"
    // or use a mapping if provided
    const mapping: Record<string, string> = {
      [process.env.JWT_SECRET_NAME || '']: 'JWT_SECRET',
      [process.env.JWT_REFRESH_SECRET_NAME || '']: 'JWT_REFRESH_SECRET',
    };

    if (mapping[secretName]) {
      return mapping[secretName];
    }

    // Default: convert to uppercase and replace special chars
    return secretName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');
  }

  clearCache(secretName?: string) {
    if (secretName) {
      this.cache.delete(secretName);
    } else {
      this.cache.clear();
    }
  }
}

