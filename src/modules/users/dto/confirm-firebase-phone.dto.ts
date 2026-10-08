import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmFirebasePhoneDto {
  @ApiProperty({ description: 'The Firebase ID Token' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ description: 'Current password, required if linking a new number' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  currentPassword?: string;
}
