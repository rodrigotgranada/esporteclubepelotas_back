import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service.js';
import { QueryNewsDto } from './dto/query-news.dto.js';

@ApiTags('News (Público)')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar matérias públicas com paginação e filtros' })
  async findAll(@Query() query: QueryNewsDto) {
    return this.newsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Obter matérias em destaque para carrossel ou capa' })
  async findFeatured(@Query('limit') limit?: number) {
    return this.newsService.findFeatured(limit ? Number(limit) : 4);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias públicas ativas' })
  async findAllCategories() {
    return this.newsService.findAllCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obter detalhes de uma matéria pública por slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }
}

