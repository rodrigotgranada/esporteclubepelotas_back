import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NewsFeaturedSlot, NewsStatus } from '../schemas/news-article.schema.js';

export class CreateNewsDto {
  @ApiProperty({ description: 'Título da matéria', example: 'Pelotas vence o clássico Farroupilha por 2 a 0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Subtítulo / Linha fina da matéria', example: 'Com gols no segundo tempo, o Lobo garantiu os três pontos na Boca do Lobo.' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'URL da imagem de capa', example: 'https://firebasestorage.../cover.jpg' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({ description: 'Legenda / Créditos da imagem de capa', example: 'Foto: Assessoria / E.C. Pelotas' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  coverCaption?: string;

  @ApiProperty({ description: 'Conteúdo em blocos Tiptap (JSON estruturado)' })
  @IsNotEmpty()
  content: Record<string, any>;

  @ApiPropertyOptional({ description: 'Resumo da matéria para SEO e cards', example: 'Vitória expressiva em casa com grande apoio da torcida áureo-cerúlea.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ description: 'ID da Categoria da matéria', example: '60d5ec49f1b2c8b1f8e4e1a1' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Tags da matéria', example: ['Gauchão', 'Lobo', 'BocaDoLobo'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ enum: NewsStatus, default: NewsStatus.DRAFT, example: NewsStatus.PUBLISHED })
  @IsEnum(NewsStatus)
  @IsOptional()
  status?: NewsStatus;

  @ApiPropertyOptional({ description: 'Se a matéria deve ser destaque principal na capa', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: NewsFeaturedSlot, default: NewsFeaturedSlot.NONE, example: NewsFeaturedSlot.MAIN })
  @IsEnum(NewsFeaturedSlot)
  @IsOptional()
  featuredSlot?: NewsFeaturedSlot;

  @ApiPropertyOptional({ description: 'Fixar matéria no topo do feed de notícias', default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Nome do repórter / autor do texto (crédito livre)', example: 'Gustavo Freitas / Assessoria FGF' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  reporterName?: string;

  @ApiPropertyOptional({ description: 'Nome do fotógrafo / agência de fotos (crédito livre)', example: 'Lucas Silva / Foto Pelotas' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  photographerName?: string;

  @ApiPropertyOptional({ description: 'Data/Hora de publicação ou agendamento (ISO 8601 UTC)', example: '2026-11-03T12:00:00.000Z' })
  @IsString()
  @IsOptional()
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'Galeria de fotos (URLs)', example: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];

  @ApiPropertyOptional({ description: 'URL de vídeo incorporado do YouTube', example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  @IsOptional()
  youtubeVideoUrl?: string;

  @ApiPropertyOptional({ description: 'Permitir reações dos torcedores nesta matéria', default: true })
  @IsBoolean()
  @IsOptional()
  allowReactions?: boolean;

  @ApiPropertyOptional({ description: 'Permitir comentários de usuários cadastrados nesta matéria', default: true })
  @IsBoolean()
  @IsOptional()
  allowComments?: boolean;
}

