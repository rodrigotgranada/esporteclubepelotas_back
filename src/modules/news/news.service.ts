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

  async findAll(query: QueryNewsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isActive: true,
      status: NewsStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { summary: searchRegex },
        { tags: searchRegex },
      ];
    }

    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.category = new Types.ObjectId(query.category);
      } else {
        const cat = await this.categoryModel.findOne({ slug: query.category.toLowerCase(), isActive: true });
        if (cat) {
          filter.category = cat._id;
        } else {
          return { data: [], total: 0, page, limit, totalPages: 0 };
        }
      }
    }

    if (query.tag) {
      const cleanTag = query.tag.replace(/^#/, '').trim();
      filter.tags = {
        $in: [cleanTag, `#${cleanTag}`, new RegExp(cleanTag, 'i')],
      };
    }

    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

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
    const article = await this.articleModel
      .findOne({
        slug: cleanSlug,
        isActive: true,
        status: NewsStatus.PUBLISHED,
        publishedAt: { $lte: new Date() },
      })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    if (!article) {
      throw new NotFoundException('Matéria não encontrada ou indisponível.');
    }

    // Increment views asynchronously without blocking response
    this.articleModel
      .updateOne({ _id: article._id }, { $inc: { viewsCount: 1 } })
      .exec()
      .catch(() => {});

    return this.mapArticle(article);
  }

  async findFeatured(limit = 4) {
    const featuredArticles = await this.articleModel
      .find({
        isActive: true,
        status: NewsStatus.PUBLISHED,
        publishedAt: { $lte: new Date() },
        isFeatured: true,
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    let allDocs = featuredArticles;

    // If fewer featured articles than limit, supplement with most recent news
    if (featuredArticles.length < limit) {
      const excludeIds = featuredArticles.map((a) => a._id);
      const remainingLimit = limit - featuredArticles.length;

      const recentArticles = await this.articleModel
        .find({
          isActive: true,
          status: NewsStatus.PUBLISHED,
          publishedAt: { $lte: new Date() },
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
