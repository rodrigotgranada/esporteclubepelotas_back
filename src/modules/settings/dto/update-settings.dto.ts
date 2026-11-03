import { IsOptional, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkItemDto {
  @IsString()
  platform: string;

  @IsString()
  label: string;

  @IsString()
  url: string;
}

export class ContactPhoneItemDto {
  @IsString()
  label: string;

  @IsString()
  number: string;

  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;
}

export class ContactEmailItemDto {
  @IsString()
  label: string;

  @IsString()
  email: string;
}

export class FooterNavigationItemDto {
  @IsString()
  label: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;
}

export class OpeningHourItemDto {
  @IsString()
  department: string;

  @IsString()
  schedule: string;
}

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkItemDto)
  socialLinks?: SocialLinkItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPhoneItemDto)
  contactPhones?: ContactPhoneItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactEmailItemDto)
  contactEmails?: ContactEmailItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterNavigationItemDto)
  footerNavigationLinks?: FooterNavigationItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHourItemDto)
  openingHours?: OpeningHourItemDto[];

  @IsOptional()
  @IsString()
  stadiumName?: string;

  @IsOptional()
  @IsString()
  stadiumAddress?: string;

  @IsOptional()
  @IsString()
  googleMapsEmbedUrl?: string;

  @IsOptional()
  @IsString()
  copyrightText?: string;
}
