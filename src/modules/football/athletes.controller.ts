import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AthletesService } from './athletes.service.js';
import { QueryAthletesDto } from './dto/query-athletes.dto.js';

@ApiTags('Futebol: Atletas (Portal Público)')
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atletas cadastrados com filtros de busca e posição' })
  async findAll(@Query() query: QueryAthletesDto) {
    return this.athletesService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obter perfil e ficha técnica de um atleta por slug com histórico de temporadas' })
  async findBySlug(@Param('slug') slug: string) {
    return this.athletesService.findBySlug(slug);
  }
}

