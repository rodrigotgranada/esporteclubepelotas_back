import { IsOptional, IsString, ValidateNested, IsBoolean, MinLength, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PreferencesDto } from './create-user.dto.js';

export class UpdateMeAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateMePhoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ type: [UpdateMeAddressDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateMeAddressDto)
  addresses?: UpdateMeAddressDto[];

  @ApiPropertyOptional({ type: [UpdateMePhoneDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateMePhoneDto)
  phones?: UpdateMePhoneDto[];

  @ApiPropertyOptional({ type: PreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}
