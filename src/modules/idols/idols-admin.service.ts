import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Idol, IdolDocument } from './schemas/idol.schema.js';
import { CreateIdolDto } from './dto/create-idol.dto.js';
import { UpdateIdolDto } from './dto/update-idol.dto.js';
import { QueryIdolsDto } from './dto/query-idols.dto.js';
import { generateUniqueIdolSlug } from './helpers/idols-slug.helper.js';
import { IdolsMapperHelper } from './helpers/idols-mapper.helper.js';
import {
  STORAGE_PROVIDER_TOKEN,
} from '../../common/providers/storage/storage.interface.js';
import type { IStorageProvider } from '../../common/providers/storage/storage.interface.js';

@Injectable()
export class IdolsAdminService {
  constructor(
    @InjectModel(Idol.name)
    private readonly idolModel: Model<IdolDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Listagem administrativa com filtros e paginação.
   */
  async findAll(query: QueryIdolsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
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
        .sort({ order: 1, isFeatured: -1, startYear: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
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
    };
  }

  /**
   * Busca detalhes por ID no painel de administração.
   */
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const idol = await this.idolModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastEditedBy', 'firstName lastName email')
      .lean()
      .exec();

    if (!idol || !idol.isActive) {
      throw new NotFoundException('Ídolo não encontrado');
    }

    return IdolsMapperHelper.mapIdol(idol);
  }

  /**
   * Cadastro de novo ídolo no Memorial.
   */
  async create(dto: CreateIdolDto, userId?: string) {
    const slugBase = dto.slug || dto.nickname || dto.name;
    const slug = await generateUniqueIdolSlug(slugBase, this.idolModel);

    const idolData: any = {
      ...dto,
      slug,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
    };

    if (dto.galleryItems && dto.galleryItems.length > 0) {
      idolData.gallery = dto.galleryItems.map((i) => i.url);
    } else if (dto.gallery && dto.gallery.length > 0) {
      idolData.galleryItems = dto.gallery.map((url) => ({ url, caption: '' }));
    }

    if (dto.periods && dto.periods.length > 0) {
      idolData.startYear = dto.periods[0].startYear;
      if (dto.periods[dto.periods.length - 1].endYear) {
        idolData.endYear = dto.periods[dto.periods.length - 1].endYear;
      }
    }

    if (userId && Types.ObjectId.isValid(userId)) {
      idolData.createdBy = new Types.ObjectId(userId);
      idolData.lastEditedBy = new Types.ObjectId(userId);
    }

    const created = await this.idolModel.create(idolData);
    return IdolsMapperHelper.mapIdol(created);
  }

  /**
   * Atualização de dados do ídolo.
   */
  async update(id: string, dto: UpdateIdolDto, userId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const idol = await this.idolModel.findById(id).exec();
    if (!idol || !idol.isActive) {
      throw new NotFoundException('Ídolo não encontrado');
    }

    if (dto.slug && dto.slug !== idol.slug) {
      idol.slug = await generateUniqueIdolSlug(dto.slug, this.idolModel, id);
    }

    if (dto.name !== undefined) idol.name = dto.name;
    if (dto.nickname !== undefined) idol.nickname = dto.nickname;
    if (dto.category !== undefined) idol.category = dto.category;
    if (dto.photoUrl !== undefined) idol.photoUrl = dto.photoUrl;
    if (dto.galleryItems !== undefined) {
      idol.galleryItems = dto.galleryItems as any;
      idol.gallery = dto.galleryItems.map((i) => i.url);
    } else if (dto.gallery !== undefined) {
      idol.gallery = dto.gallery;
      idol.galleryItems = dto.gallery.map((url) => ({ url, caption: '' }));
    }
    if (dto.periods !== undefined) {
      idol.periods = dto.periods as any;
      if (dto.periods.length > 0 && dto.startYear === undefined) {
        idol.startYear = dto.periods[0].startYear;
        if (dto.periods[dto.periods.length - 1].endYear !== undefined) {
          idol.endYear = dto.periods[dto.periods.length - 1].endYear;
        }
      }
    }
    if (dto.startYear !== undefined) idol.startYear = dto.startYear;
    if (dto.endYear !== undefined) idol.endYear = dto.endYear;
    if (dto.isActiveInClub !== undefined) idol.isActiveInClub = dto.isActiveInClub;
    if (dto.birthDate !== undefined) idol.birthDate = dto.birthDate ? new Date(dto.birthDate) : undefined;
    if (dto.deathDate !== undefined) idol.deathDate = dto.deathDate ? new Date(dto.deathDate) : undefined;
    if (dto.birthPlace !== undefined) idol.birthPlace = dto.birthPlace;
    if (dto.quote !== undefined) idol.quote = dto.quote;
    if (dto.biography !== undefined) idol.biography = dto.biography;
    if (dto.playerStats !== undefined) idol.playerStats = dto.playerStats as any;
    if (dto.coachStats !== undefined) idol.coachStats = dto.coachStats as any;
    if (dto.staffStats !== undefined) idol.staffStats = dto.staffStats as any;
    if (dto.fanStats !== undefined) idol.fanStats = dto.fanStats as any;
    if (dto.isFeatured !== undefined) idol.isFeatured = dto.isFeatured;
    if (dto.order !== undefined) idol.order = dto.order;

    if (userId && Types.ObjectId.isValid(userId)) {
      idol.lastEditedBy = new Types.ObjectId(userId);
    }

    await idol.save();
    return IdolsMapperHelper.mapIdol(idol);
  }

  /**
   * Exclusão lógica (soft delete).
   */
  async softDelete(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const idol = await this.idolModel.findById(id).exec();
    if (!idol || !idol.isActive) {
      throw new NotFoundException('Ídolo não encontrado');
    }

    idol.isActive = false;
    await idol.save();

    return { success: true, message: 'Ídolo removido do Memorial com sucesso.' };
  }

  /**
   * Upload de foto principal do ídolo.
   */
  async uploadPhoto(id: string, file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const idol = await this.idolModel.findById(id).exec();
    if (!idol || !idol.isActive) {
      throw new NotFoundException('Ídolo não encontrado');
    }

    const ext = file.mimetype?.split('/')[1] || 'webp';
    const unique = Math.round(Math.random() * 1e6);
    const fileName = `photo-${Date.now()}-${unique}.${ext}`;
    const folder = `idols/${id}`;

    const url = await this.storageProvider.uploadFile(
      file.buffer,
      fileName,
      folder,
      file.mimetype || 'image/webp',
    );

    idol.photoUrl = url;
    await idol.save();

    return { photoUrl: url, message: 'Foto do ídolo atualizada com sucesso.' };
  }

  /**
   * Upload de foto para a galeria histórica do ídolo.
   */
  async uploadGallery(id: string, files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const idol = await this.idolModel.findById(id).exec();
    if (!idol || !idol.isActive) {
      throw new NotFoundException('Ídolo não encontrado');
    }

    const folder = `idols/${id}/gallery`;
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const ext = file.mimetype?.split('/')[1] || 'webp';
      const unique = Math.round(Math.random() * 1e6);
      const fileName = `gallery-${Date.now()}-${unique}.${ext}`;
      const url = await this.storageProvider.uploadFile(
        file.buffer,
        fileName,
        folder,
        file.mimetype || 'image/webp',
      );
      uploadedUrls.push(url);
    }

    idol.gallery = [...(idol.gallery || []), ...uploadedUrls];
    idol.galleryItems = [
      ...(idol.galleryItems || []),
      ...uploadedUrls.map((url) => ({ url, caption: '' })),
    ];
    await idol.save();

    return {
      gallery: idol.gallery,
      galleryItems: idol.galleryItems,
      message: 'Fotos adicionadas à galeria histórica com sucesso.',
    };
  }
}
