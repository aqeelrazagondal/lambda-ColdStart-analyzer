import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { SecretsService } from '../config/secrets.service';

interface UploadFromPathOptions {
  filePath: string;
  key: string;
  bucket?: string;
  contentType?: string;
}

interface DownloadToPathOptions {
  key: string;
  destination: string;
  bucket?: string;
}

@Injectable()
export class BundleStorageService implements OnModuleInit {
  private readonly bucket = process.env.BUNDLE_AUDIT_BUCKET;
  private client: S3Client | null = null;
  private credentialsLoaded = false;

  constructor(private secretsService: SecretsService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    if (this.client && this.credentialsLoaded) {
      return;
    }

    const region =
      process.env.BUNDLE_AUDIT_REGION ||
      process.env.BUNDLE_AUDIT_S3_REGION ||
      process.env.AWS_REGION ||
      'us-east-1';
    const endpoint = process.env.BUNDLE_AUDIT_ENDPOINT || process.env.BUNDLE_AUDIT_S3_ENDPOINT || undefined;
    const forcePathStyle =
      (process.env.BUNDLE_AUDIT_FORCE_PATH_STYLE || process.env.BUNDLE_AUDIT_S3_FORCE_PATH_STYLE || '').toLowerCase() ===
      'true';

    let accessKey: string | undefined;
    let secretKey: string | undefined;
    let sessionToken: string | undefined;

    // Try to get credentials from Secrets Manager
    const awsCredentialsSecretName = process.env.AWS_CREDENTIALS_SECRET_NAME;
    if (awsCredentialsSecretName) {
      try {
        const credentials = await this.secretsService.getSecretJson<{
          accessKeyId: string;
          secretAccessKey: string;
          sessionToken?: string;
        }>(awsCredentialsSecretName);
        accessKey = credentials.accessKeyId;
        secretKey = credentials.secretAccessKey;
        sessionToken = credentials.sessionToken;
      } catch (err) {
        // Fall through to environment variables
      }
    }

    // Fallback to environment variables
    if (!accessKey || !secretKey) {
      accessKey = process.env.BUNDLE_AUDIT_ACCESS_KEY || process.env.BUNDLE_AUDIT_S3_ACCESS_KEY;
      secretKey = process.env.BUNDLE_AUDIT_SECRET_KEY || process.env.BUNDLE_AUDIT_S3_SECRET_KEY;
      sessionToken = process.env.BUNDLE_AUDIT_SESSION_TOKEN || process.env.BUNDLE_AUDIT_S3_SESSION_TOKEN;
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKey && secretKey
          ? {
              accessKeyId: accessKey,
              secretAccessKey: secretKey,
              sessionToken: sessionToken || undefined,
            }
          : undefined,
    });

    this.credentialsLoaded = true;
  }

  private async ensureClient() {
    if (!this.client) {
      await this.initializeClient();
    }
    if (!this.client) {
      throw new InternalServerErrorException('S3 client not initialized');
    }
  }

  getBucket() {
    if (!this.bucket) {
      throw new InternalServerErrorException('BUNDLE_AUDIT_BUCKET is not configured');
    }
    return this.bucket;
  }

  async uploadFromPath(opts: UploadFromPathOptions) {
    await this.ensureClient();
    const bucket = opts.bucket || this.getBucket();
    const body = fs.createReadStream(opts.filePath);
    await this.client!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: opts.key,
        Body: body,
        ContentType: opts.contentType || 'application/zip',
      })
    );
    return { bucket, key: opts.key };
  }

  async downloadToPath(opts: DownloadToPathOptions) {
    await this.ensureClient();
    const bucket = opts.bucket || this.getBucket();
    const resp = await this.client!.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: opts.key,
      })
    );
    if (!resp.Body) throw new InternalServerErrorException('Bundle object missing body');
    await fsp.mkdir(path.dirname(opts.destination), { recursive: true });
    await pipeline(resp.Body as NodeJS.ReadableStream, fs.createWriteStream(opts.destination));
    return opts.destination;
  }
}
