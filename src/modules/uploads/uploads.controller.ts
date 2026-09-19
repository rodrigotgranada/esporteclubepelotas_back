import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN, type IStorageProvider } from '../../common/providers/storage/storage.interface.js';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(@Inject(STORAGE_PROVIDER_TOKEN) private readonly storageProvider: IStorageProvider) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image and get its public URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Valida tipo de arquivo básico
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = `avatar-${uniqueSuffix}.${file.mimetype.split('/')[1] || 'jpg'}`;
    const folder = process.env.NODE_ENV === 'production' ? 'prod/avatars' : 'avatars';

    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);

    return { url };
  }
}
