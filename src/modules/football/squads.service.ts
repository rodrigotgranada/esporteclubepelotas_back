import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Squad, SquadCategory, SquadDocument, SquadSector } from './schemas/squad.schema.js';
import { QuerySquadsDto } from './dto/query-squads.dto.js';
import { FootballMapperHelper } from './helpers/football-mapper.helper.js';
import { SystemModulesService } from '../system-modules/system-modules.service.js';

@Injectable()
export class SquadsService {
  constructor(
    @InjectModel(Squad.name)
    private readonly squadModel: Model<SquadDocument>,
    private readonly systemModulesService: SystemModulesService,
  ) {}

  /**
   * Listar temporadas e categorias cadastradas para alimentar os filtros do portal.
   */
  async getSeasons() {
    const isModuleActive = await this.systemModulesService.isModuleActive('football');
    if (!isModuleActive) {
      return { years: [], categories: [], isModuleActive: false };
    }

    const [years, categories] = await Promise.all([
      this.squadModel.distinct('year', { isActive: true }).exec(),
      this.squadModel.distinct('category', { isActive: true }).exec(),
    ]);

    return {
      years: (years as number[]).sort((a, b) => b - a),
      categories: categories as string[],
      isModuleActive: true,
    };
  }

  /**
   * Listagem de elencos com paginação e filtros de ano e categoria.
   */
  async findAll(query: QuerySquadsDto) {
    const isModuleActive = await this.systemModulesService.isModuleActive('football');
    if (!isModuleActive) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: query.limit || 20,
        totalPages: 0,
        isModuleActive: false,
      };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isActive: true,
    };

    if (query.year) {
      filter.year = query.year;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.isCurrent !== undefined) {
      filter.isCurrent = query.isCurrent;
    }

    const [data, total] = await Promise.all([
      this.squadModel
        .find(filter)
        .sort({ year: -1, isCurrent: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.squadModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((doc) => FootballMapperHelper.mapSquad(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      isModuleActive: true,
    };
  }

  /**
   * Obter elenco atual em atividade com atletas agrupados por setor tático.
   */
  async getCurrent(category: SquadCategory = SquadCategory.PROFESSIONAL) {
    const isModuleActive = await this.systemModulesService.isModuleActive('football');
    if (!isModuleActive) {
      return null;
    }

    let squad = await this.squadModel
      .findOne({
        isCurrent: true,
        category,
        isActive: true,
      })
      .populate({
        path: 'members.athlete',
        match: { isActive: true },
      })
      .lean()
      .exec();

    // Se não tiver nenhum marcado explicitamente como isCurrent, busca o mais recente do ano
    if (!squad) {
      squad = await this.squadModel
        .findOne({
          category,
          isActive: true,
        })
        .sort({ year: -1, createdAt: -1 })
        .populate({
          path: 'members.athlete',
          match: { isActive: true },
        })
        .lean()
        .exec();
    }

    if (!squad) {
      return null;
    }

    return this.organizeSquadSectors(squad);
  }

  /**
   * Obter elenco completo de um ano e categoria específicos.
   */
  async getByYearAndCategory(year: number, category: SquadCategory) {
    const isModuleActive = await this.systemModulesService.isModuleActive('football');
    if (!isModuleActive) {
      throw new NotFoundException('Módulo de Futebol está temporariamente desativado.');
    }

    const squad = await this.squadModel
      .findOne({
        year,
        category,
        isActive: true,
      })
      .populate({
        path: 'members.athlete',
        match: { isActive: true },
      })
      .lean()
      .exec();

    if (!squad) {
      throw new NotFoundException(`Elenco de ${year} (${category}) não encontrado.`);
    }

    return this.organizeSquadSectors(squad);
  }

  /**
   * Helper para agrupar atletas por setor tático (Goleiros, Defesa, Meio, Ataque).
   */
  private organizeSquadSectors(squadDoc: any) {
    const mapped = FootballMapperHelper.mapSquad(squadDoc);
    if (!mapped) return null;

    const goalkeepers = mapped.members.filter((m: any) => m?.sector === SquadSector.GOALKEEPER);
    const defenders = mapped.members.filter((m: any) => m?.sector === SquadSector.DEFENDER);
    const midfielders = mapped.members.filter((m: any) => m?.sector === SquadSector.MIDFIELDER);
    const forwards = mapped.members.filter((m: any) => m?.sector === SquadSector.FORWARD);

    return {
      ...mapped,
      sectors: {
        goalkeepers,
        defenders,
        midfielders,
        forwards,
      },
    };
  }
}
