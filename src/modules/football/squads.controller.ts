import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SquadsService } from './squads.service.js';
import { QuerySquadsDto } from './dto/query-squads.dto.js';
import { SquadCategory } from './schemas/squad.schema.js';

@ApiTags('Futebol: Elencos & Temporadas (Portal Público)')
@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Get('seasons')
  @ApiOperation({ summary: 'Listar temporadas e categorias disponíveis para filtros no portal' })
  async getSeasons() {
    return this.squadsService.getSeasons();
  }

  @Get('current')
  @ApiOperation({ summary: 'Obter elenco atual em atividade organizado por setores táticos' })
  async getCurrent(@Query('category') category?: SquadCategory) {
    return this.squadsService.getCurrent(category);
  }

  @Get(':year/:category')
  @ApiOperation({ summary: 'Obter elenco de um ano e categoria específicos organizado por setores' })
  async getByYearAndCategory(
    @Param('year') year: number,
    @Param('category') category: SquadCategory,
  ) {
    return this.squadsService.getByYearAndCategory(Number(year), category);
  }

  @Get()
  @ApiOperation({ summary: 'Listar elencos com filtros de ano e categoria' })
  async findAll(@Query() query: QuerySquadsDto) {
    return this.squadsService.findAll(query);
  }
}

