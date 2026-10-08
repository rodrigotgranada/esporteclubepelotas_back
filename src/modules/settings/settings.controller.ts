import { Controller, Get, Put, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage', 'users.manage')
  @UseInterceptors(FileInterceptor('logo'))
  async updateSettings(
    @Body('data') dataStr: string,
    @UploadedFile() file?: any,
  ) {
    let updateSettingsDto = new UpdateSettingsDto();
    
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        updateSettingsDto = plainToInstance(UpdateSettingsDto, parsed);
        const errors = await validate(updateSettingsDto, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length > 0) {
          throw new BadRequestException(errors);
        }
      } catch (err) {
        throw new BadRequestException('Invalid JSON payload or validation failed');
      }
    }
    
    return this.settingsService.updateSettings(updateSettingsDto, file);
  }
}
