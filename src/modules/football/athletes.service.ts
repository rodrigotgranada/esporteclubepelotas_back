import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Athlete, AthleteDocument } from './schemas/athlete.schema.js';
import { Squad, SquadDocument } from './schemas/squad.schema.js';
import { QueryAthletesDto } from './dto/query-athletes.dto.js';
import { FootballMapperHelper } from './helpers/football-mapper.helper.js';
import { SystemModulesService } from '../system-modules/system-modules.service.js';

@Injectable()
export class AthletesService {
  constructor(
    @InjectModel(Athlete.name)
    private readonly athleteModel: Model<AthleteDocument>,
    @InjectModel(Squad.name)
    private readonly squadModel: Model<SquadDocument>,
    private readonly systemModulesService: SystemModulesService,
  ) {}

  /**
   * Listagem pública de atletas com filtros de busca e posição.
   */
  async findAll(query: QueryAthletesDto) {
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

    if (query.position) {
      filter.$or = [
        { primaryPosition: query.position },
        { secondaryPositions: query.position },
      ];
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { nickname: searchRegex },
        { primaryPosition: searchRegex },
      ];
    }

    const [data, total] = await Promise.all([
      this.athleteModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.athleteModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((doc) => FootballMapperHelper.mapAthlete(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      isModuleActive: true,
    };
  }

  /**
   * Detalhes públicos de um atleta por slug, incluindo temporadas que defendeu.
   */
  async findBySlug(slug: string) {
    const isModuleActive = await this.systemModulesService.isModuleActive('football');
    if (!isModuleActive) {
      throw new NotFoundException('Módulo de Futebol está temporariamente desativado.');
    }

    const athlete = await this.athleteModel
      .findOne({
        slug: slug.toLowerCase().trim(),
        isActive: true,
      })
      .lean()
      .exec();

    if (!athlete) {
      throw new NotFoundException('Atleta não encontrado no elenco do Pelotas.');
    }

    // Busca todas as temporadas/elencos em que o atleta participou
    const squads = await this.squadModel
      .find({
        'members.athlete': athlete._id,
        isActive: true,
      })
      .sort({ year: -1 })
      .lean()
      .exec();

    const seasons = squads.map((squad) => {
      const memberInfo = (squad.members || []).find(
        (m: any) => m.athlete.toString() === athlete._id.toString(),
      );
      return {
        squadId: squad._id.toString(),
        year: squad.year,
        category: squad.category,
        seasonName: squad.seasonName,
        jerseyNumber: memberInfo?.jerseyNumber || null,
        sector: memberInfo?.sector || null,
        role: memberInfo?.role || 'STARTER',
      };
    });

    const mappedAthlete = FootballMapperHelper.mapAthlete(athlete);

    return {
      ...mappedAthlete,
      seasons,
    };
  }
}

