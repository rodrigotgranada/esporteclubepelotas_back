import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferredFoot } from '../schemas/athlete.schema.js';

export class CreateAthleteDto {
  @ApiProperty({ description: 'Nome completo do atleta', example: 'Walter Henrique de Oliveira' })
  @IsString()
  @IsNotEmpty({ message: 'O nome completo do atleta é obrigatório.' })
  name: string;

  @ApiPropertyOptional({ description: 'Apelido ou nome de camisa', example: 'Walter' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Slug único (gerado automaticamente se omitido)', example: 'walter' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'URL da foto oficial do atleta' })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Data de nascimento (ISO-8601)', example: '1989-07-22' })
  @IsDateString({}, { message: 'A data de nascimento deve ser uma data válida.' })
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Naturalidade (Cidade - UF)', example: 'Recife - PE' })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({ description: 'Altura em centímetros', example: 178 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Peso em kg', example: 85 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ enum: PreferredFoot, default: PreferredFoot.RIGHT })
  @IsEnum(PreferredFoot)
  @IsOptional()
  preferredFoot?: PreferredFoot;

  @ApiProperty({ description: 'Posição principal de atuação', example: 'Centroavante' })
  @IsString()
  @IsNotEmpty({ message: 'A posição principal é obrigatória.' })
  primaryPosition: string;

  @ApiPropertyOptional({ description: 'Posições secundárias', example: ['Segundo Atacante'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryPositions?: string[];

  @ApiPropertyOptional({ description: 'Clubes anteriores', example: ['Goiás', 'Fluminense', 'Athletico-PR'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pastClubs?: string[];

  @ApiPropertyOptional({ description: 'Resumo da carreira e características' })
  @IsString()
  @IsOptional()
  biography?: string;

  @ApiPropertyOptional({ description: 'Perfil no Instagram (sem @ ou link completo)', example: 'walter_oficial' })
  @IsString()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
