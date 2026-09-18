import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
  providers: []
})
export class UploadsModule {}
