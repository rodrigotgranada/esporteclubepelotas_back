import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NewsArticle,
  NewsArticleDocument,
  NewsStatus,
} from './schemas/news-article.schema.js';
import {
  NewsCategory,
  NewsCategoryDocument,
} from './schemas/news-category.schema.js';
import { CreateNewsDto } from './dto/create-news.dto.js';
import { UpdateNewsDto } from './dto/update-news.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { QueryNewsDto } from './dto/query-news.dto.js';
import {
  STORAGE_PROVIDER_TOKEN,
  type IStorageProvider,
} from '../../common/providers/storage/storage.interface.js';

@Injectable()
export class NewsAdminService {
  constructor(
    @InjectModel(NewsArticle.name)
    private readonly articleModel: Model<NewsArticleDocument>,
    @InjectModel(NewsCategory.name)
    private readonly categoryModel: Model<NewsCategoryDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Helper para sanitizar strings e produzir slugs amigáveis.
   * Remove acentos, caracteres especiais e substitui espaços por hífens.
   */
  private slugify(text: string): string {
    const slug = text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return slug || 'materia';
  }

  /**
   * Garante slug único prevenindo colisões (ex: noticia, noticia-1, noticia-2).
   */
  async generateUniqueSlug(title: string, currentArticleId?: string): Promise<string> {
    const baseSlug = this.slugify(title);

    // Encontra todos os slugs que começam com o baseSlug
    const regex = new RegExp(`^${baseSlug}(-[0-9]+)?$`);
    const existingArticles = await this.articleModel
      .find({ slug: regex })
      .select('_id slug')
      .lean()
      .exec();

    // Filtra artigos que não sejam o próprio que está sendo editado
    const otherSlugs = existingArticles
      .filter(a => !currentArticleId || a._id.toString() !== currentArticleId.toString())
      .map(a => a.slug);

    if (!otherSlugs.includes(baseSlug)) {
      return baseSlug;
    }

    // Se houver colisão, busca o maior índice numérico sufixado
    let maxSuffix = 0;
    for (const s of otherSlugs) {
      const match = s.match(new RegExp(`^${baseSlug}-([0-9]+)$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxSuffix) maxSuffix = num;
      }
    }

    return `${baseSlug}-${maxSuffix + 1}`;
  }

  async adminFindAll(query: QueryNewsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isActive: true,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.category = new Types.ObjectId(query.category);
      } else {
        const cat = await this.categoryModel.findOne({ slug: query.category.toLowerCase() });
        if (cat) filter.category = cat._id;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { summary: searchRegex },
        { tags: searchRegex },
      ];
    }

    const [data, total] = await Promise.all([
      this.articleModel
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl email')
        .lean()
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminFindById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const article = await this.articleModel
      .findById(id)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl email')
      .exec();

    if (!article) {
      throw new NotFoundException('Matéria não encontrada');
    }

    return article;
  }

  async create(createNewsDto: CreateNewsDto, authorId: string) {
    const slug = await this.generateUniqueSlug(createNewsDto.title);

    let publishedAt: Date | undefined;
    if (createNewsDto.status === NewsStatus.PUBLISHED) {
      publishedAt = createNewsDto.publishedAt
        ? new Date(createNewsDto.publishedAt)
        : new Date();
    } else if (createNewsDto.publishedAt) {
      publishedAt = new Date(createNewsDto.publishedAt);
    }

    // Normalização das tags
    const cleanTags = (createNewsDto.tags || []).map(t =>
      t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`
    );

    const article = new this.articleModel({
      ...createNewsDto,
      slug,
      author: new Types.ObjectId(authorId),
      category: new Types.ObjectId(createNewsDto.category),
      tags: cleanTags,
      publishedAt,
      viewsCount: 0,
      isActive: true,
    });

    return article.save();
  }

  async update(id: string, updateNewsDto: UpdateNewsDto) {
    const article = await this.adminFindById(id);

    let slug = article.slug;
    if (updateNewsDto.slug && updateNewsDto.slug !== article.slug) {
      slug = await this.generateUniqueSlug(updateNewsDto.slug, id);
    } else if (updateNewsDto.title && updateNewsDto.title !== article.title && !updateNewsDto.slug) {
      slug = await this.generateUniqueSlug(updateNewsDto.title, id);
    }

    let publishedAt = article.publishedAt;
    if (updateNewsDto.publishedAt) {
      publishedAt = new Date(updateNewsDto.publishedAt);
    } else if (updateNewsDto.status === NewsStatus.PUBLISHED && !article.publishedAt) {
      publishedAt = new Date();
    }

    const updatePayload: Record<string, any> = {
      ...updateNewsDto,
      slug,
      publishedAt,
    };

    if (updateNewsDto.category) {
      updatePayload.category = new Types.ObjectId(updateNewsDto.category);
    }

    if (updateNewsDto.tags) {
      updatePayload.tags = updateNewsDto.tags.map(t =>
        t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`
      );
    }

    return this.articleModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl email')
      .exec();
  }

  async softDelete(id: string) {
    const article = await this.adminFindById(id);
    article.isActive = false;
    await article.save();
    return { success: true, message: 'Matéria excluída com sucesso (soft-delete).' };
  }

  async uploadCover(id: string, file: any) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('O arquivo enviado deve ser uma imagem.');
    }

    // Garante que a matéria existe
    await this.adminFindById(id);

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const fileName = `cover-${Date.now()}.${ext}`;
    const folder = `news/${id}`;

    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);

    await this.articleModel.findByIdAndUpdate(id, { coverImage: url });

    return { url };
  }

  async uploadGallery(id: string, files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    await this.adminFindById(id);

    const folder = `news/${id}/gallery`;
    const urls: string[] = [];

    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) continue;
      const ext = file.mimetype.split('/')[1] || 'jpg';
      const unique = Math.round(Math.random() * 1e6);
      const fileName = `photo-${Date.now()}-${unique}.${ext}`;
      const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      urls.push(url);
    }

    if (urls.length > 0) {
      await this.articleModel.findByIdAndUpdate(id, {
        $push: { gallery: { $each: urls } },
      });
    }

    return { urls };
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const baseSlug = this.slugify(createCategoryDto.name);

    let slug = baseSlug;
    let counter = 1;
    while (await this.categoryModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const category = new this.categoryModel({
      name: createCategoryDto.name.trim(),
      slug,
      description: createCategoryDto.description?.trim(),
      isActive: true,
      order: 0,
    });

    return category.save();
  }

  async adminFindAllCategories() {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();
  }
}
