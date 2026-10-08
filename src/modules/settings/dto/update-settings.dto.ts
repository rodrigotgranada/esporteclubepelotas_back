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

  @IsOptional()
  socialMedia?: {
    instagram?: string[];
    facebook?: string[];
    x?: string[];
    youtube?: string[];
  };
}
