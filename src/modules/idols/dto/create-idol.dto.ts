import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IdolCategory } from '../schemas/idol.schema.js';

export class PlayerStatsDto {
  @ApiPropertyOptional({ example: 'Atacante' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ example: 'Destro' })
  @IsString()
  @IsOptional()
  preferredFoot?: string;

  @ApiPropertyOptional({ example: 9 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  historicJerseyNumber?: number;

  @ApiPropertyOptional({ example: 342 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  matchesCount?: number;

  @ApiPropertyOptional({ example: 128 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  goalsCount?: number;

  @ApiPropertyOptional({ example: ['Campeonato Gaúcho 1930', 'Copa FGF 2019'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  titles?: string[];

  @ApiPropertyOptional({ example: 'Pelotas 3x1 Brasil em 1984' })
  @IsString()
  @IsOptional()
  memorableMatch?: string;
}

export class CoachStatsDto {
  @ApiPropertyOptional({ example: 148 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  matchesCount?: number;

  @ApiPropertyOptional({ example: 82 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  winsCount?: number;

  @ApiPropertyOptional({ example: 36 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  drawsCount?: number;

  @ApiPropertyOptional({ example: 30 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  lossesCount?: number;

  @ApiPropertyOptional({ example: ['Copa FGF 2019', 'Recopa Gaúcha 2020'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  titles?: string[];

  @ApiPropertyOptional({ example: 'Estilo ofensivo e veloz' })
  @IsString()
  @IsOptional()
  tacticalStyle?: string;
}

export class StaffStatsDto {
  @ApiPropertyOptional({ example: 'Roupeiro Histórico' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({ example: 'Mais de 35 anos dedicados ao Lobo' })
  @IsString()
  @IsOptional()
  yearsOfDedication?: string;

  @ApiPropertyOptional({ example: 'Cuidava com amor das camisas do título de 1930' })
  @IsString()
  @IsOptional()
  backstageStory?: string;
}

export class FanStatsDto {
  @ApiPropertyOptional({ example: 'Arquibancada Pavilhão das Sociais' })
  @IsString()
  @IsOptional()
  stadiumSector?: string;

  @ApiPropertyOptional({ example: 'O famoso bumbo da Charanga Áureo-Cerúlea' })
  @IsString()
  @IsOptional()
  trademark?: string;
}

export class CreateIdolDto {
  @ApiProperty({ example: 'Flávio Almeida da Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O nome do ídolo é obrigatório.' })
  name: string;

  @ApiPropertyOptional({ example: 'Flávio Minuano' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ example: 'flavio-minuano' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ enum: IdolCategory, example: IdolCategory.PLAYER })
  @IsEnum(IdolCategory, { message: 'Categoria de ídolo inválida.' })
  category: IdolCategory;

  @ApiPropertyOptional({ example: 'https://storage.../foto.webp' })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ example: ['https://storage.../foto1.webp'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];

  @ApiProperty({ example: 1960 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'O ano inicial de passagem pelo clube é obrigatório.' })
  startYear: number;

  @ApiPropertyOptional({ example: 1972 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  endYear?: number;

  @ApiPropertyOptional({ example: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActiveInClub?: boolean;

  @ApiPropertyOptional({ example: '1944-07-09' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: '2020-05-18' })
  @IsDateString()
  @IsOptional()
  deathDate?: string;

  @ApiPropertyOptional({ example: 'Pelotas - RS' })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({ example: 'A Boca do Lobo sempre foi meu verdadeiro templo.' })
  @IsString()
  @IsOptional()
  quote?: string;

  @ApiProperty({ example: 'Iniciou nas categorias de base do Lobo em 1960...' })
  @IsString()
  @IsNotEmpty({ message: 'A biografia ou história do ídolo é obrigatória.' })
  biography: string;

  @ApiPropertyOptional({ type: PlayerStatsDto })
  @ValidateNested()
  @Type(() => PlayerStatsDto)
  @IsOptional()
  playerStats?: PlayerStatsDto;

  @ApiPropertyOptional({ type: CoachStatsDto })
  @ValidateNested()
  @Type(() => CoachStatsDto)
  @IsOptional()
  coachStats?: CoachStatsDto;

  @ApiPropertyOptional({ type: StaffStatsDto })
  @ValidateNested()
  @Type(() => StaffStatsDto)
  @IsOptional()
  staffStats?: StaffStatsDto;

  @ApiPropertyOptional({ type: FanStatsDto })
  @ValidateNested()
  @Type(() => FanStatsDto)
  @IsOptional()
  fanStats?: FanStatsDto;

  @ApiPropertyOptional({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  order?: number;
}
