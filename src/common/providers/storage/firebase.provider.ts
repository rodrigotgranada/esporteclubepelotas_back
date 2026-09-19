import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { IStorageProvider } from './storage.interface.js';
import * as crypto from 'crypto';

@Injectable()
export class FirebaseStorageProvider implements IStorageProvider {
  private bucket: any;
  private readonly logger = new Logger(FirebaseStorageProvider.name);

  constructor(private configService: ConfigService) {
    try {
      const base64Creds = this.configService.get<string>('FIREBASE_CREDENTIALS_BASE64');
      const storageBucket = this.configService.get<string>('FIREBASE_STORAGE_BUCKET');
      
      if (!getApps().length && base64Creds && storageBucket) {
        const serviceAccount = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf8'));
        const app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: storageBucket,
        });
        this.bucket = getStorage(app).bucket();
        this.logger.log('✅ Storage Firebase Conectado');
      } else {
        this.logger.warn('⚠️ Credenciais Firebase não encontradas no .env. Operando em modo Mock.');
      }
    } catch (err) {
      this.logger.error(`❌ Falha ao conectar no Firebase: ${(err as Error).message}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, folder: string, mimeType: string): Promise<string> {
    if (!this.bucket) {
      this.logger.warn(`[Mock] Uploaded to Firebase: ${folder}/${fileName}`);
      return `https://mock-firebase-url.com/${folder}/${fileName}`;
    }

    const file = this.bucket.file(`${folder}/${fileName}`);
    const downloadToken = crypto.randomUUID();

    await file.save(fileBuffer, {
      metadata: { 
        contentType: mimeType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      },
      public: true,
    });
    
    // Adicionamos o token gerado na URL para que o Firebase Console e o Client SDK reconheçam
    return `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(`${folder}/${fileName}`)}?alt=media&token=${downloadToken}`;
  }
}
