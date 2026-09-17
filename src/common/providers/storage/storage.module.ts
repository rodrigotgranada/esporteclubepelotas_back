import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER_TOKEN } from './storage.interface.js';
import { FirebaseStorageProvider } from './firebase.provider.js';
import { AwsStorageProvider } from './aws-s3.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('STORAGE_PROVIDER');
        
        if (provider === 'aws') {
          return new AwsStorageProvider(configService);
        }
        
        // Default to Firebase
        return new FirebaseStorageProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN],
})
export class StorageModule {}
