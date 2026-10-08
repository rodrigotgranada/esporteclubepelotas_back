import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { STORAGE_PROVIDER_TOKEN, type IStorageProvider } from '../../common/providers/storage/storage.interface.js';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private settingModel: Model<SettingDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storageProvider: IStorageProvider,
  ) {}

  async getSettings(): Promise<Setting> {
    let settings = await this.settingModel.findOne();
    if (!settings) {
      settings = await this.settingModel.create({});
    }
    return settings.toObject();
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto, file?: any): Promise<Setting> {
    let settings = await this.settingModel.findOne();
    
    if (file) {
      const fileName = `club-logo-${Date.now()}`;
      const folder = 'settings';
      const logoUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      updateSettingsDto.clubLogoUrl = logoUrl;
      
      const currentGallery = updateSettingsDto.clubLogoGallery || (settings?.clubLogoGallery || []);
      if (!currentGallery.includes(logoUrl)) {
        updateSettingsDto.clubLogoGallery = [logoUrl, ...currentGallery];
      }
    }

    // Clean up undefined properties so Mongoose doesn't unset them
    Object.keys(updateSettingsDto).forEach(key => {
      if (updateSettingsDto[key as keyof UpdateSettingsDto] === undefined) {
        delete updateSettingsDto[key as keyof UpdateSettingsDto];
      }
    });

    if (!settings) {
      settings = await this.settingModel.create(updateSettingsDto);
    } else {
      settings.set(updateSettingsDto);
      await settings.save();
    }
    return settings.toObject();
  }
}
