import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { Setting, SettingSchema } from './schemas/setting.schema.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    StorageModule
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
