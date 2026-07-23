import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadedFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

@Injectable()
export class StorageService {
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get('S3_BUCKET', 'careforge-documents');
    this.client = new Minio.Client({
      endPoint: this.configService.get('S3_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('S3_PORT', 9000),
      useSSL: this.configService.get('S3_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('S3_ACCESS_KEY', 'careforge_admin'),
      secretKey: this.configService.get('S3_SECRET_KEY', 'careforge_storage_2024'),
    });
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not ensure bucket: ${err.message}`);
    }
  }

  async upload(file: Buffer, originalName: string, mimeType: string, folder = 'uploads'): Promise<UploadedFile> {
    const ext = path.extname(originalName);
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.client.putObject(this.bucket, key, file, file.length, {
      'Content-Type': mimeType,
      'X-Original-Name': originalName,
    });

    const url = await this.getPresignedUrl(key);
    return { key, url, size: file.length, mimeType, originalName };
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async getFile(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
