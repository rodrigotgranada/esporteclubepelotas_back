import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria (ex: Futebol Profissional)', example: 'Futebol Profissional' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria', example: 'Notícias do time principal e jogos' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}

