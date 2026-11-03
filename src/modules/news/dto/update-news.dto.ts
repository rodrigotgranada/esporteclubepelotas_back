import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateNewsDto } from './create-news.dto.js';
import { IsOptional, IsString } from 'class-validator';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @ApiPropertyOptional({ description: 'Slug personalizado (caso deseje sobrescrever manualmente)' })
  @IsString()
  @IsOptional()
  slug?: string;
}
