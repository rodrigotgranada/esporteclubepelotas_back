import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Athlete, AthleteDocument } from './schemas/athlete.schema.js';
import { CreateAthleteDto } from './dto/create-athlete.dto.js';
import { UpdateAthleteDto } from './dto/update-athlete.dto.js';
import { QueryAthletesDto } from './dto/query-athletes.dto.js';
import { generateUniqueAthleteSlug } from './helpers/athletes-slug.helper.js';
import { FootballMapperHelper } from './helpers/football-mapper.helper.js';
import {
  STORAGE_PROVIDER_TOKEN,
} from '../../common/providers/storage/storage.interface.js';
import type { IStorageProvider } from '../../common/providers/storage/storage.interface.js';

@Injectable()
export class AthletesAdminService {
  constructor(
    @InjectModel(Athlete.name)
    private readonly athleteModel: Model<AthleteDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Listagem de atletas no painel com paginação e filtros.
   */
  async findAll(query: QueryAthletesDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

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
        .populate('createdBy', 'firstName lastName email')
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
    };
  }

  /**
   * Buscar atleta por ID para edição.
   */
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de atleta inválido.');
    }

    const athlete = await this.athleteModel.findById(id).lean().exec();
    if (!athlete) {
      throw new NotFoundException('Atleta não encontrado.');
    }

    return FootballMapperHelper.mapAthlete(athlete);
  }

  /**
   * Cadastro de novo atleta.
   */
  async create(dto: CreateAthleteDto, userId?: string) {
    const slug = await generateUniqueAthleteSlug(
      this.athleteModel,
      dto.name,
      dto.nickname,
    );

    const payload: any = {
      ...dto,
      slug,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      createdBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    };

    const created = await this.athleteModel.create(payload);
    return FootballMapperHelper.mapAthlete(created);
  }

  /**
   * Atualização de dados cadastrais de atleta.
   */
  async update(id: string, dto: UpdateAthleteDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de atleta inválido.');
    }

    const existing = await this.athleteModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Atleta não encontrado para atualização.');
    }

    let slug = existing.slug;
    if (
      (dto.name && dto.name !== existing.name) ||
      (dto.nickname !== undefined && dto.nickname !== existing.nickname)
    ) {
      slug = await generateUniqueAthleteSlug(
        this.athleteModel,
        dto.name || existing.name,
        dto.nickname !== undefined ? dto.nickname : existing.nickname,
        id,
      );
    }

    const payload: any = {
      ...dto,
      slug,
    };

    if (dto.birthDate !== undefined) {
      payload.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }

    const updated = await this.athleteModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .lean()
      .exec();

    return FootballMapperHelper.mapAthlete(updated);
  }

  /**
   * Inativação segura (Soft Delete) do atleta.
   */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de atleta inválido.');
    }

    const updated = await this.athleteModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Atleta não encontrado para exclusão.');
    }

    return { success: true, message: 'Atleta desativado com sucesso.' };
  }

  /**
   * Upload de foto oficial do atleta para o Storage.
   */
  async uploadPhoto(id: string, file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de atleta inválido.');
    }

    const athlete = await this.athleteModel.findById(id).exec();
    if (!athlete) {
      throw new NotFoundException('Atleta não encontrado.');
    }

    const ext = file.mimetype?.split('/')[1] || 'webp';
    const unique = Math.round(Math.random() * 1e6);
    const fileName = `photo-${Date.now()}-${unique}.${ext}`;
    const folder = `athletes/${id}`;

    const photoUrl = await this.storageProvider.uploadFile(
      file.buffer,
      fileName,
      folder,
      file.mimetype || 'image/webp',
    );

    athlete.photoUrl = photoUrl;
    await athlete.save();

    return { photoUrl };
  }
}
