import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Squad, SquadDocument } from './schemas/squad.schema.js';
import { CreateSquadDto } from './dto/create-squad.dto.js';
import { UpdateSquadDto } from './dto/update-squad.dto.js';
import { QuerySquadsDto } from './dto/query-squads.dto.js';
import { SetSquadMembersDto, SquadMemberDto } from './dto/manage-squad-members.dto.js';
import { FootballMapperHelper } from './helpers/football-mapper.helper.js';
import {
  STORAGE_PROVIDER_TOKEN,
} from '../../common/providers/storage/storage.interface.js';
import type { IStorageProvider } from '../../common/providers/storage/storage.interface.js';

@Injectable()
export class SquadsAdminService {
  constructor(
    @InjectModel(Squad.name)
    private readonly squadModel: Model<SquadDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Listagem de elencos no painel administrativo com paginação.
   */
  async findAll(query: QuerySquadsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

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
        .sort({ year: -1, category: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('members.athlete')
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
    };
  }

  /**
   * Buscar elenco por ID no painel com atletas populados.
   */
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const squad = await this.squadModel
      .findById(id)
      .populate('members.athlete')
      .lean()
      .exec();

    if (!squad) {
      throw new NotFoundException('Elenco não encontrado.');
    }

    return FootballMapperHelper.mapSquad(squad);
  }

  /**
   * Criação de novo elenco/temporada.
   */
  async create(dto: CreateSquadDto, userId?: string) {
    // Se marcado como elenco atual, desmarca outros da mesma categoria
    if (dto.isCurrent) {
      await this.squadModel.updateMany(
        { category: dto.category, isCurrent: true },
        { $set: { isCurrent: false } },
      );
    }

    const formattedMembers = (dto.members || []).map((m) => ({
      athlete: new Types.ObjectId(m.athleteId),
      jerseyNumber: m.jerseyNumber,
      sector: m.sector,
      role: m.role || 'STARTER',
      order: m.order || 0,
    }));

    const payload: any = {
      ...dto,
      members: formattedMembers,
      createdBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    };

    const created = await this.squadModel.create(payload);
    return FootballMapperHelper.mapSquad(created);
  }

  /**
   * Atualização de dados gerais do elenco.
   */
  async update(id: string, dto: UpdateSquadDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const existing = await this.squadModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Elenco não encontrado para atualização.');
    }

    // Se marcar como atual, desmarca outros da mesma categoria
    if (dto.isCurrent) {
      const targetCategory = dto.category || existing.category;
      await this.squadModel.updateMany(
        { _id: { $ne: id }, category: targetCategory, isCurrent: true },
        { $set: { isCurrent: false } },
      );
    }

    const payload: any = { ...dto };
    if (dto.members) {
      payload.members = dto.members.map((m) => ({
        athlete: new Types.ObjectId(m.athleteId),
        jerseyNumber: m.jerseyNumber,
        sector: m.sector,
        role: m.role || 'STARTER',
        order: m.order || 0,
      }));
    }

    const updated = await this.squadModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .populate('members.athlete')
      .lean()
      .exec();

    return FootballMapperHelper.mapSquad(updated);
  }

  /**
   * Substituição em lote dos membros do elenco.
   */
  async setMembers(squadId: string, dto: SetSquadMembersDto) {
    if (!Types.ObjectId.isValid(squadId)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const formattedMembers = dto.members.map((m) => ({
      athlete: new Types.ObjectId(m.athleteId),
      jerseyNumber: m.jerseyNumber,
      sector: m.sector,
      role: m.role || 'STARTER',
      order: m.order || 0,
    }));

    const updated = await this.squadModel
      .findByIdAndUpdate(
        squadId,
        { $set: { members: formattedMembers } },
        { new: true },
      )
      .populate('members.athlete')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Elenco não encontrado.');
    }

    return FootballMapperHelper.mapSquad(updated);
  }

  /**
   * Adicionar ou atualizar um membro específico no elenco.
   */
  async addOrUpdateMember(squadId: string, memberDto: SquadMemberDto) {
    if (!Types.ObjectId.isValid(squadId)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const squad = await this.squadModel.findById(squadId).exec();
    if (!squad) {
      throw new NotFoundException('Elenco não encontrado.');
    }

    const existingIndex = squad.members.findIndex(
      (m: any) => m.athlete.toString() === memberDto.athleteId,
    );

    const newMemberData: any = {
      athlete: new Types.ObjectId(memberDto.athleteId),
      jerseyNumber: memberDto.jerseyNumber,
      sector: memberDto.sector,
      role: memberDto.role || 'STARTER',
      order: memberDto.order || 0,
    };

    if (existingIndex >= 0) {
      squad.members[existingIndex] = newMemberData;
    } else {
      squad.members.push(newMemberData);
    }

    await squad.save();
    return this.findById(squadId);
  }

  /**
   * Remover atleta de um elenco.
   */
  async removeMember(squadId: string, athleteId: string) {
    if (!Types.ObjectId.isValid(squadId) || !Types.ObjectId.isValid(athleteId)) {
      throw new BadRequestException('IDs inválidos fornecidos.');
    }

    const updated = await this.squadModel
      .findByIdAndUpdate(
        squadId,
        { $pull: { members: { athlete: new Types.ObjectId(athleteId) } } },
        { new: true },
      )
      .populate('members.athlete')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Elenco não encontrado.');
    }

    return FootballMapperHelper.mapSquad(updated);
  }

  /**
   * Inativação segura do elenco (Soft Delete).
   */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const updated = await this.squadModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Elenco não encontrado para exclusão.');
    }

    return { success: true, message: 'Elenco desativado com sucesso.' };
  }

  /**
   * Upload de foto oficial de capa do elenco.
   */
  async uploadCover(id: string, file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de elenco inválido.');
    }

    const squad = await this.squadModel.findById(id).exec();
    if (!squad) {
      throw new NotFoundException('Elenco não encontrado.');
    }

    const ext = file.mimetype?.split('/')[1] || 'webp';
    const unique = Math.round(Math.random() * 1e6);
    const fileName = `cover-${Date.now()}-${unique}.${ext}`;
    const folder = `squads/${id}`;

    const coverUrl = await this.storageProvider.uploadFile(
      file.buffer,
      fileName,
      folder,
      file.mimetype || 'image/webp',
    );

    squad.coverUrl = coverUrl;
    await squad.save();

    return { coverUrl };
  }
}
