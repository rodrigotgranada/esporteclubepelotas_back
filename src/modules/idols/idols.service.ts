import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Idol, IdolDocument } from './schemas/idol.schema.js';
import { QueryIdolsDto } from './dto/query-idols.dto.js';
import { IdolsMapperHelper } from './helpers/idols-mapper.helper.js';
import { SystemModulesService } from '../system-modules/system-modules.service.js';

@Injectable()
export class IdolsService {
  constructor(
    @InjectModel(Idol.name)
    private readonly idolModel: Model<IdolDocument>,
    private readonly systemModulesService: SystemModulesService,
  ) {}

  /**
   * Lista pública de ídolos com filtros de categoria, busca e destaque.
   */
  async findAll(query: QueryIdolsDto) {
    const isModuleActive = await this.systemModulesService.isModuleActive('idols');
    if (!isModuleActive) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: query.limit || 12,
        totalPages: 0,
        isModuleActive: false,
      };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 12;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isActive: true,
    };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { nickname: searchRegex }, { quote: searchRegex }];
    }

    const [data, total] = await Promise.all([
      this.idolModel
        .find(filter)
        .sort({ isFeatured: -1, order: 1, startYear: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.idolModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((doc) => IdolsMapperHelper.mapIdol(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      isModuleActive: true,
    };
  }

  /**
   * Busca detalhes completos do ídolo por slug no portal público.
   */
  async findBySlug(slug: string) {
    const isModuleActive = await this.systemModulesService.isModuleActive('idols');
    if (!isModuleActive) {
      throw new NotFoundException('Módulo de Ídolos está temporariamente indisponível.');
    }

    const idol = await this.idolModel
      .findOne({
        slug: slug.toLowerCase().trim(),
        isActive: true,
      })
      .lean()
      .exec();

    if (!idol) {
      throw new NotFoundException('Ídolo não encontrado no Memorial.');
    }

    return IdolsMapperHelper.mapIdol(idol);
  }

  /**
   * Retorna os principais ídolos em destaque para exibição na Home ou seções rápidas.
   */
  async findFeatured(limit = 4) {
    const isModuleActive = await this.systemModulesService.isModuleActive('idols');
    if (!isModuleActive) {
      return [];
    }

    const idols = await this.idolModel
      .find({
        isActive: true,
        isFeatured: true,
      })
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return idols.map((doc) => IdolsMapperHelper.mapIdol(doc));
  }

  /**
   * Retorna o ídolo anterior e próximo na ordenação do Memorial.
   */
  async getPrevNext(slug: string) {
    const isModuleActive = await this.systemModulesService.isModuleActive('idols');
    if (!isModuleActive) {
      throw new NotFoundException('Módulo de Ídolos está temporariamente indisponível.');
    }

    const current = await this.idolModel
      .findOne({ slug: slug.toLowerCase().trim(), isActive: true })
      .select('order startYear name slug')
      .lean()
      .exec();

    if (!current) {
      throw new NotFoundException('Ídolo não encontrado no Memorial.');
    }

    const currentOrder = current.order ?? 0;
    const currentYear = current.startYear ?? 0;
    const currentId = current._id;

    const prev = await this.idolModel
      .findOne({
        isActive: true,
        $or: [
          { order: { $lt: currentOrder } },
          { order: currentOrder, startYear: { $lt: currentYear } },
          { order: currentOrder, startYear: currentYear, _id: { $lt: currentId } },
        ],
      })
      .sort({ order: -1, startYear: -1, _id: -1 })
      .lean()
      .exec();

    const next = await this.idolModel
      .findOne({
        isActive: true,
        $or: [
          { order: { $gt: currentOrder } },
          { order: currentOrder, startYear: { $gt: currentYear } },
          { order: currentOrder, startYear: currentYear, _id: { $gt: currentId } },
        ],
      })
      .sort({ order: 1, startYear: 1, _id: 1 })
      .lean()
      .exec();

    return {
      previous: prev ? IdolsMapperHelper.mapIdol(prev) : null,
      next: next ? IdolsMapperHelper.mapIdol(next) : null,
    };
  }
}

