import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IStorageProvider } from './storage.interface.js';

@Injectable()
export class AwsStorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(AwsStorageProvider.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || 'mock-bucket';
    
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_KEY');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.logger.warn('Credenciais AWS não encontradas. Operando em Mock mode.');
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, folder: string, mimeType: string): Promise<string> {
    if (!this.s3Client) {
      this.logger.warn(`[Mock] Uploaded to AWS S3: ${folder}/${fileName}`);
      return `https://mock-s3-url.com/${folder}/${fileName}`;
    }

    const key = `${folder}/${fileName}`;
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    }));

    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }
}
