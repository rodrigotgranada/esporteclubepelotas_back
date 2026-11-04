import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SquadCategory } from '../schemas/squad.schema.js';
import { SquadMemberDto } from './manage-squad-members.dto.js';

export class SquadStaffDto {
  @ApiProperty({ description: 'Cargo ou função na comissão técnica', example: 'Auxiliar Técnico' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Nome do profissional', example: 'Felipe Endres' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateSquadDto {
  @ApiProperty({ description: 'Ano da temporada', example: 2025 })
  @IsNumber()
  @Min(1908)
  @Type(() => Number)
  year: number;

  @ApiProperty({ enum: SquadCategory, description: 'Categoria do elenco', example: SquadCategory.PROFESSIONAL })
  @IsEnum(SquadCategory)
  category: SquadCategory;

  @ApiProperty({ description: 'Nome descritivo da temporada / competição', example: 'Temporada 2025 - Gauchão' })
  @IsString()
  @IsNotEmpty({ message: 'O nome da temporada é obrigatório.' })
  seasonName: string;

  @ApiPropertyOptional({ description: 'Treinador principal do time', example: 'Leocir Dall’Astra' })
  @IsString()
  @IsOptional()
  coachName?: string;

  @ApiPropertyOptional({ type: [SquadStaffDto], description: 'Membros da comissão técnica' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SquadStaffDto)
  @IsOptional()
  staff?: SquadStaffDto[];

  @ApiPropertyOptional({ description: 'Foto oficial do elenco perfilado' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Define se é o elenco ativo atual', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @ApiPropertyOptional({ type: [SquadMemberDto], description: 'Atletas integrantes do elenco' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SquadMemberDto)
  @IsOptional()
  members?: SquadMemberDto[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

