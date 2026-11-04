import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NewsArticle,
  NewsArticleDocument,
  NewsStatus,
  NewsFeaturedSlot,
} from './schemas/news-article.schema.js';
import { NewsCategory, NewsCategoryDocument } from './schemas/news-category.schema.js';
import { CreateNewsDto } from './dto/create-news.dto.js';
import { UpdateNewsDto } from './dto/update-news.dto.js';
import { QueryNewsDto } from './dto/query-news.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import {
  STORAGE_PROVIDER_TOKEN,
} from '../../common/providers/storage/storage.interface.js';
import type { IStorageProvider } from '../../common/providers/storage/storage.interface.js';
import { slugify, generateUniqueArticleSlug } from './helpers/news-slug.helper.js';
import { processContentBase64Images } from './helpers/news-content-processor.helper.js';

@Injectable()
export class NewsAdminService {
  private readonly logger = new Logger(NewsAdminService.name);

  constructor(
    @InjectModel(NewsArticle.name)
    private readonly articleModel: Model<NewsArticleDocument>,
    @InjectModel(NewsCategory.name)
    private readonly categoryModel: Model<NewsCategoryDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  private mapArticle(doc: any) {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
      ...obj,
      _id: obj._id?.toString ? obj._id.toString() : String(obj._id),
      id: obj._id?.toString ? obj._id.toString() : String(obj.id || obj._id),
      category:
        obj.category && typeof obj.category === 'object' && obj.category._id
          ? {
              ...obj.category,
              _id: obj.category._id?.toString ? obj.category._id.toString() : String(obj.category._id),
              id: obj.category._id?.toString ? obj.category._id.toString() : String(obj.category.id || obj.category._id),
            }
          : obj.category,
      author:
        obj.author && typeof obj.author === 'object' && obj.author._id
          ? {
              ...obj.author,
              _id: obj.author._id?.toString ? obj.author._id.toString() : String(obj.author._id),
              id: obj.author._id?.toString ? obj.author._id.toString() : String(obj.author.id || obj.author._id),
            }
          : obj.author,
    };
  }

  private mapCategory(doc: any) {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
      ...obj,
      _id: obj._id?.toString ? obj._id.toString() : String(obj._id),
      id: obj._id?.toString ? obj._id.toString() : String(obj.id || obj._id),
    };
  }

  /**
   * Garante slug único prevenindo colisões (ex: noticia, noticia-1, noticia-2).
   */
  async generateUniqueSlug(title: string, currentArticleId?: string): Promise<string> {
    return generateUniqueArticleSlug(title, this.articleModel, currentArticleId);
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

    if (query.featuredSlot) {
      filter.featuredSlot = query.featuredSlot;
    }

    if (query.isPinned !== undefined) {
      filter.isPinned = query.isPinned;
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
        .sort({ isPinned: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl email')
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((d) => this.mapArticle(d)),
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

    return this.mapArticle(article);
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
    const cleanTags = (createNewsDto.tags || []).map((t) =>
      t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`
    );

    let content = createNewsDto.content;
    if (content) {
      content = await processContentBase64Images(content, this.storageProvider);
    }

    let featuredSlot = createNewsDto.featuredSlot || NewsFeaturedSlot.NONE;
    let isFeatured = Boolean(createNewsDto.isFeatured);

    if (featuredSlot === NewsFeaturedSlot.MAIN) {
      isFeatured = true;
      // Demove qualquer outro manchetão ativo para destaque secundário
      await this.articleModel.updateMany(
        { featuredSlot: NewsFeaturedSlot.MAIN, isActive: true },
        { $set: { featuredSlot: NewsFeaturedSlot.SECONDARY } },
      );
    } else if (featuredSlot === NewsFeaturedSlot.SECONDARY) {
      isFeatured = true;
    } else if (isFeatured && featuredSlot === NewsFeaturedSlot.NONE) {
      featuredSlot = NewsFeaturedSlot.MAIN;
    }

    const article = new this.articleModel({
      ...createNewsDto,
      content,
      slug,
      isFeatured,
      featuredSlot,
      isPinned: Boolean(createNewsDto.isPinned),
      reporterName: createNewsDto.reporterName ? createNewsDto.reporterName.trim() : undefined,
      photographerName: createNewsDto.photographerName ? createNewsDto.photographerName.trim() : undefined,
      author: new Types.ObjectId(authorId),
      category: new Types.ObjectId(createNewsDto.category),
      tags: cleanTags,
      publishedAt,
      viewsCount: 0,
      isActive: true,
    });

    const saved = await article.save();
    return this.mapArticle(saved);
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, userId?: string) {
    const article = await this.adminFindById(id);

    let slug = article.slug;
    const previousSlugs: string[] = Array.isArray(article.previousSlugs)
      ? [...article.previousSlugs]
      : [];

    if (updateNewsDto.slug && updateNewsDto.slug.trim() !== article.slug) {
      slug = await this.generateUniqueSlug(updateNewsDto.slug, id);
      if (article.slug && !previousSlugs.includes(article.slug)) {
        previousSlugs.push(article.slug);
      }
    } else if (
      article.status === NewsStatus.DRAFT &&
      updateNewsDto.title &&
      updateNewsDto.title !== article.title &&
      !updateNewsDto.slug
    ) {
      // Regenera automaticamente a partir do título apenas se a matéria ainda for um Rascunho
      slug = await this.generateUniqueSlug(updateNewsDto.title, id);
    }

    let publishedAt = article.publishedAt;
    if (updateNewsDto.publishedAt) {
      publishedAt = new Date(updateNewsDto.publishedAt);
    } else if (updateNewsDto.status === NewsStatus.PUBLISHED && !article.publishedAt) {
      publishedAt = new Date();
    }

    let featuredSlot = updateNewsDto.featuredSlot !== undefined
      ? updateNewsDto.featuredSlot
      : article.featuredSlot;
    let isFeatured = updateNewsDto.isFeatured !== undefined
      ? updateNewsDto.isFeatured
      : article.isFeatured;

    if (updateNewsDto.featuredSlot === NewsFeaturedSlot.MAIN) {
      isFeatured = true;
      featuredSlot = NewsFeaturedSlot.MAIN;
      // Demove outro manchetão ativo para destaque secundário
      await this.articleModel.updateMany(
        {
          _id: { $ne: new Types.ObjectId(id) },
          featuredSlot: NewsFeaturedSlot.MAIN,
          isActive: true,
        },
        { $set: { featuredSlot: NewsFeaturedSlot.SECONDARY } },
      );
    } else if (updateNewsDto.featuredSlot === NewsFeaturedSlot.SECONDARY) {
      isFeatured = true;
      featuredSlot = NewsFeaturedSlot.SECONDARY;
    } else if (updateNewsDto.featuredSlot === NewsFeaturedSlot.NONE) {
      isFeatured = false;
      featuredSlot = NewsFeaturedSlot.NONE;
    } else if (updateNewsDto.isFeatured !== undefined && updateNewsDto.featuredSlot === undefined) {
      if (updateNewsDto.isFeatured) {
        featuredSlot = article.featuredSlot && article.featuredSlot !== NewsFeaturedSlot.NONE
          ? article.featuredSlot
          : NewsFeaturedSlot.MAIN;
      } else {
        featuredSlot = NewsFeaturedSlot.NONE;
      }
    }

    const updatePayload: Record<string, any> = {
      ...updateNewsDto,
      slug,
      previousSlugs,
      publishedAt,
      isFeatured,
      featuredSlot,
    };

    if (updateNewsDto.isPinned !== undefined) {
      updatePayload.isPinned = Boolean(updateNewsDto.isPinned);
    }

    if (updateNewsDto.reporterName !== undefined) {
      updatePayload.reporterName = updateNewsDto.reporterName ? updateNewsDto.reporterName.trim() : undefined;
    }

    if (updateNewsDto.photographerName !== undefined) {
      updatePayload.photographerName = updateNewsDto.photographerName ? updateNewsDto.photographerName.trim() : undefined;
    }

    if (updateNewsDto.content) {
      updatePayload.content = await processContentBase64Images(updateNewsDto.content, this.storageProvider);
    }

    if (updateNewsDto.category) {
      updatePayload.category = new Types.ObjectId(updateNewsDto.category);
    }

    if (updateNewsDto.tags) {
      updatePayload.tags = updateNewsDto.tags.map((t) =>
        t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`
      );
    }

    if (userId) {
      updatePayload.lastEditedBy = new Types.ObjectId(userId);
    }

    const updated = await this.articleModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl email')
      .exec();

    return this.mapArticle(updated);
  }

  async softDelete(id: string) {
    const article = await this.articleModel.findById(id).exec();
    if (!article) throw new NotFoundException('Matéria não encontrada');
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
    const baseSlug = slugify(createCategoryDto.name);

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

    const saved = await category.save();
    return this.mapCategory(saved);
  }

  async adminFindAllCategories() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();

    return categories.map((c) => this.mapCategory(c));
  }

  async uploadContentImage(file: any) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('O arquivo enviado deve ser uma imagem.');
    }

    const ext = file.mimetype.split('/')[1] || 'png';
    const unique = Math.round(Math.random() * 1e6);
    const fileName = `content-${Date.now()}-${unique}.${ext}`;
    const folder = `news/content`;

    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
    return { url };
  }

  async duplicate(id: string, userId: string) {
    const original = await this.articleModel.findById(id);
    if (!original || !original.isActive) {
      throw new NotFoundException('Matéria original não encontrada.');
    }

    const timestamp = Date.now().toString().slice(-4);
    const newSlug = `${original.slug}-copia-${timestamp}`;
    const newTitle = `${original.title} (Cópia)`;

    const duplicated = await this.articleModel.create({
      title: newTitle,
      subtitle: original.subtitle,
      slug: newSlug,
      previousSlugs: [],
      coverImage: original.coverImage,
      coverCaption: original.coverCaption,
      content: original.content,
      summary: original.summary,
      category: original.category,
      tags: original.tags,
      status: NewsStatus.DRAFT,
      isFeatured: false,
      featuredSlot: NewsFeaturedSlot.NONE,
      isPinned: false,
      reporterName: original.reporterName,
      photographerName: original.photographerName,
      author: new Types.ObjectId(userId),
      lastEditedBy: new Types.ObjectId(userId),
      gallery: original.gallery,
      youtubeVideoUrl: original.youtubeVideoUrl,
      allowReactions: original.allowReactions ?? true,
      allowComments: original.allowComments ?? true,
      reactions: { wolf: 0, fire: 0, clap: 0, heart: 0 },
      viewsCount: 0,
      isActive: true,
    });

    const populated = await duplicated.populate('category', 'name slug');
    return this.mapArticle(populated);
  }
}
