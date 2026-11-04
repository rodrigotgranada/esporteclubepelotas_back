import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdolsService } from './idols.service.js';
import { QueryIdolsDto } from './dto/query-idols.dto.js';

@ApiTags('Ídolos & Memorial (Portal Público)')
@Controller('idols')
export class IdolsController {
  constructor(private readonly idolsService: IdolsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ídolos do Memorial com filtros (público, sem autenticação)' })
  async findAll(@Query() query: QueryIdolsDto) {
    return this.idolsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Listar ídolos em destaque para a vitrine/home' })
  async findFeatured(@Query('limit') limit?: number) {
    return this.idolsService.findFeatured(limit ? Number(limit) : 4);
  }

  @Get(':slug/prev-next')
  @ApiOperation({ summary: 'Obter ídolo anterior e próximo na linha do Memorial' })
  async getPrevNext(@Param('slug') slug: string) {
    return this.idolsService.getPrevNext(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obter perfil detalhado de um ídolo por slug (público)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.idolsService.findBySlug(slug);
  }
}

