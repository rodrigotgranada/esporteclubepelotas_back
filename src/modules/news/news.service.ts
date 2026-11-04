import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NewsArticle, NewsArticleDocument, NewsStatus, NewsFeaturedSlot } from './schemas/news-article.schema.js';
import { NewsCategory, NewsCategoryDocument } from './schemas/news-category.schema.js';
import { NewsComment, NewsCommentDocument, NewsCommentStatus } from './schemas/news-comment.schema.js';
import { QueryNewsDto } from './dto/query-news.dto.js';
import { NewsReactionType } from './dto/react-news.dto.js';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(NewsArticle.name)
    private readonly articleModel: Model<NewsArticleDocument>,
    @InjectModel(NewsCategory.name)
    private readonly categoryModel: Model<NewsCategoryDocument>,
    @InjectModel(NewsComment.name)
    private readonly commentModel: Model<NewsCommentDocument>,
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

    if (query.featuredSlot) {
      andConditions.push({ featuredSlot: query.featuredSlot });
    }

    if (query.isPinned !== undefined) {
      andConditions.push({ isPinned: query.isPinned });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const [rawDocs, total] = await Promise.all([
      this.articleModel
        .find(filter)
        .sort({ isPinned: -1, isFeatured: -1, publishedAt: -1 })
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

    // 1. Busca primeiro o Manchetão Principal (MAIN)
    const mainArticles = await this.articleModel
      .find({
        ...publishCondition,
        featuredSlot: NewsFeaturedSlot.MAIN,
      })
      .sort({ publishedAt: -1 })
      .limit(1)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    const collectedIds = mainArticles.map((a) => a._id);

    // 2. Busca os Destaques Secundários (SECONDARY)
    let secondaryArticles: any[] = [];
    if (collectedIds.length < limit) {
      secondaryArticles = await this.articleModel
        .find({
          ...publishCondition,
          _id: { $nin: collectedIds },
          featuredSlot: NewsFeaturedSlot.SECONDARY,
        })
        .sort({ publishedAt: -1 })
        .limit(limit - collectedIds.length)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec();

      secondaryArticles.forEach((a) => collectedIds.push(a._id));
    }

    // 3. Se ainda houver vagas, busca matérias marcadas com isFeatured genérico
    let remainingFeatured: any[] = [];
    if (collectedIds.length < limit) {
      remainingFeatured = await this.articleModel
        .find({
          ...publishCondition,
          _id: { $nin: collectedIds },
          isFeatured: true,
        })
        .sort({ publishedAt: -1 })
        .limit(limit - collectedIds.length)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec();

      remainingFeatured.forEach((a) => collectedIds.push(a._id));
    }

    // 4. Se ainda assim houver vagas, complementa com as mais recentes publicadas
    let recentArticles: any[] = [];
    if (collectedIds.length < limit) {
      recentArticles = await this.articleModel
        .find({
          ...publishCondition,
          _id: { $nin: collectedIds },
        })
        .sort({ publishedAt: -1 })
        .limit(limit - collectedIds.length)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatarUrl')
        .exec();
    }

    const allDocs = [...mainArticles, ...secondaryArticles, ...remainingFeatured, ...recentArticles];
    return allDocs.map((d) => this.mapArticle(d));
  }

  async findAllCategories() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();

    return categories.map((c) => this.mapCategory(c));
  }

  async reactToArticle(slugOrId: string, type: NewsReactionType) {
    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article) {
      throw new NotFoundException('Matéria não encontrada.');
    }

    if (article.allowReactions === false) {
      throw new ForbiddenException('As reações estão desativadas para esta publicação.');
    }

    const updated = await this.articleModel
      .findByIdAndUpdate(
        article._id,
        { $inc: { [`reactions.${type}`]: 1 } },
        { new: true, select: 'reactions' },
      )
      .exec();

    return {
      reactions: updated?.reactions || { wolf: 0, fire: 0, clap: 0, heart: 0 },
    };
  }

  async getComments(slugOrId: string) {
    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article) {
      throw new NotFoundException('Matéria não encontrada.');
    }

    const comments = await this.commentModel
      .find({
        article: article._id,
        isActive: true,
        status: NewsCommentStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .populate('author', 'firstName lastName avatar avatarUrl role')
      .exec();

    return comments.map((c) => ({
      _id: c._id.toString(),
      id: c._id.toString(),
      content: c.content,
      createdAt: (c as any).createdAt,
      author: c.author,
    }));
  }

  async addComment(slugOrId: string, userId: string, content: string) {
    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article) {
      throw new NotFoundException('Matéria não encontrada.');
    }

    if (article.allowComments === false) {
      throw new ForbiddenException('Os comentários estão desativados para esta publicação.');
    }

    const comment = await this.commentModel.create({
      article: article._id,
      author: new Types.ObjectId(userId),
      content: content.trim(),
      status: NewsCommentStatus.ACTIVE,
      isActive: true,
    });

    const populated = await comment.populate('author', 'firstName lastName avatar avatarUrl role');

    return {
      _id: populated._id.toString(),
      id: populated._id.toString(),
      content: populated.content,
      createdAt: (populated as any).createdAt,
      author: populated.author,
    };
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    const comment = await this.commentModel.findById(commentId);
    if (!comment || !comment.isActive) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    const isAuthor = comment.author.toString() === userId;
    const isStaff = ['Owner', 'Admin', 'Editor'].includes(userRole);

    if (!isAuthor && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para remover este comentário.');
    }

    comment.isActive = false;
    await comment.save();

    return { success: true, message: 'Comentário removido com sucesso.' };
  }

  async getPrevNext(slugOrId: string) {
    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article || !article.publishedAt) {
      return { previous: null, next: null };
    }

    const publishCondition = this.getPublicPublishCondition();

    const [prev, next] = await Promise.all([
      this.articleModel
        .findOne({
          ...publishCondition,
          _id: { $ne: article._id },
          publishedAt: { $lt: article.publishedAt },
        })
        .sort({ publishedAt: -1 })
        .select('title slug coverImage publishedAt')
        .exec(),
      this.articleModel
        .findOne({
          ...publishCondition,
          _id: { $ne: article._id },
          publishedAt: { $gt: article.publishedAt },
        })
        .sort({ publishedAt: 1 })
        .select('title slug coverImage publishedAt')
        .exec(),
    ]);

    return {
      previous: prev
        ? { title: prev.title, slug: prev.slug, coverImage: prev.coverImage, publishedAt: prev.publishedAt }
        : null,
      next: next
        ? { title: next.title, slug: next.slug, coverImage: next.coverImage, publishedAt: next.publishedAt }
        : null,
    };
  }
}
