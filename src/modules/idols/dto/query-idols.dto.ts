import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IdolCategory } from '../schemas/idol.schema.js';

export class QueryIdolsDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Busca por nome ou apelido' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: IdolCategory, description: 'Filtrar por categoria' })
  @IsEnum(IdolCategory)
  @IsOptional()
  category?: IdolCategory;

  @ApiPropertyOptional({ description: 'Filtrar apenas em destaque' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
