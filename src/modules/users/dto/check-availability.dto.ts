import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({ description: 'The type of field to check', enum: ['email', 'cpf'] })
  @IsEnum(['email', 'cpf'])
  @IsNotEmpty()
  type: 'email' | 'cpf';

  @ApiProperty({ description: 'The value to check for availability' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
