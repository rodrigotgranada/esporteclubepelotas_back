import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NewsArticle, NewsArticleDocument, NewsStatus } from './schemas/news-article.schema.js';
import { NewsCategory, NewsCategoryDocument } from './schemas/news-category.schema.js';
import { QueryNewsDto } from './dto/query-news.dto.js';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(NewsArticle.name)
    private readonly articleModel: Model<NewsArticleDocument>,
    @InjectModel(NewsCategory.name)
    private readonly categoryModel: Model<NewsCategoryDocument>,
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

  private getPublicPublishCondition() {
    const now = new Date();
    return {
      isActive: true,
      $or: [
        { status: NewsStatus.PUBLISHED, publishedAt: { $lte: now } },
        { status: NewsStatus.SCHEDULED, publishedAt: { $lte: now } },
      ],
    };
  }

  async findAll(query: QueryNewsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const andConditions: any[] = [
      this.getPublicPublishCondition(),
    ];

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      andConditions.push({
        $or: [
          { title: searchRegex },
          { subtitle: searchRegex },
          { summary: searchRegex },
          { tags: searchRegex },
        ],
      });
    }

    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        andConditions.push({ category: new Types.ObjectId(query.category) });
      } else {
        const cat = await this.categoryModel.findOne({ slug: query.category.toLowerCase(), isActive: true });
        if (cat) {
          andConditions.push({ category: cat._id });
        } else {
          return { data: [], total: 0, page, limit, totalPages: 0 };
        }
      }
    }

    if (query.tag) {
      const cleanTag = query.tag.replace(/^#/, '').trim();
      andConditions.push({
        tags: {
          $in: [cleanTag, `#${cleanTag}`, new RegExp(cleanTag, 'i')],
        },
      });
    }

    if (query.isFeatured !== undefined) {
      andConditions.push({ isFeatured: query.isFeatured });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const [rawDocs, total] = await Promise.all([
      this.articleModel
        .find(filter)
        .sort({ isFeatured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
    ]);

    return {
      data: rawDocs.map((d) => this.mapArticle(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string) {
    const cleanSlug = slug.toLowerCase().trim();
    const publishCondition = this.getPublicPublishCondition();

    // 1. Tenta encontrar pelo slug atual primário
    let article = await this.articleModel
      .findOne({
        slug: cleanSlug,
        ...publishCondition,
      })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    let isRedirect = false;

    // 2. Se não encontrou, busca no histórico previousSlugs (redirecionamento 301)
    if (!article) {
      article = await this.articleModel
        .findOne({
          previousSlugs: cleanSlug,
          ...publishCondition,
        })
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec();

      if (article) {
        isRedirect = true;
      }
    }

    if (!article) {
      throw new NotFoundException('Matéria não encontrada ou indisponível.');
    }

    // Incrementa visualizações de forma assíncrona
    this.articleModel
      .updateOne({ _id: article._id }, { $inc: { viewsCount: 1 } })
      .exec()
      .catch(() => {});

    const mapped = this.mapArticle(article);
    if (isRedirect) {
      return {
        ...mapped,
        _redirectTo: article.slug,
      };
    }

    return mapped;
  }

  async findFeatured(limit = 4) {
    const publishCondition = this.getPublicPublishCondition();

    const featuredArticles = await this.articleModel
      .find({
        ...publishCondition,
        isFeatured: true,
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    let allDocs = featuredArticles;

    // Se houver menos destaques que o limite, complementa com as matérias mais recentes
    if (featuredArticles.length < limit) {
      const excludeIds = featuredArticles.map((a) => a._id);
      const remainingLimit = limit - featuredArticles.length;

      const recentArticles = await this.articleModel
        .find({
          ...publishCondition,
          _id: { $nin: excludeIds },
        })
        .sort({ publishedAt: -1 })
        .limit(remainingLimit)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec();

      allDocs = [...featuredArticles, ...recentArticles];
    }

    return allDocs.map((d) => this.mapArticle(d));
  }

  async findAllCategories() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();

    return categories.map((c) => this.mapCategory(c));
  }
}
