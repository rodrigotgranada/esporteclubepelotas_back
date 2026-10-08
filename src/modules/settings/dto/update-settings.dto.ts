import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  clubLogoUrl?: string;

  @IsOptional()
  @IsString()
  clubName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clubLogoGallery?: string[];
}
