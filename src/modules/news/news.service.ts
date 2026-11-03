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

    const [data, total] = await Promise.all([
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
      data,
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

    return article;
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

    // If fewer featured articles than limit, supplement with most recent news
    if (featuredArticles.length < limit) {
      const excludeIds = featuredArticles.map(a => a._id);
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

      return [...featuredArticles, ...recentArticles];
    }

    return featuredArticles;
  }

  async findAllCategories() {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();
  }
}
