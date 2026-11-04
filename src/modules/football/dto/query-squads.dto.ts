import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SquadCategory } from '../schemas/squad.schema.js';

export class QuerySquadsDto {
  @ApiPropertyOptional({ description: 'Filtrar por ano da temporada', example: 2025 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ enum: SquadCategory, description: 'Filtrar por categoria' })
  @IsEnum(SquadCategory)
  @IsOptional()
  category?: SquadCategory;

  @ApiPropertyOptional({ description: 'Filtrar apenas elenco atual' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isCurrent?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
