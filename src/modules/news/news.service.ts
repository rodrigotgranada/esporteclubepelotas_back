import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NewsArticle, NewsArticleDocument, NewsStatus, NewsFeaturedSlot } from './schemas/news-article.schema.js';
import { NewsCategory, NewsCategoryDocument } from './schemas/news-category.schema.js';
import { NewsComment, NewsCommentDocument, NewsCommentStatus } from './schemas/news-comment.schema.js';
import { NewsReaction, NewsReactionDocument } from './schemas/news-reaction.schema.js';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema.js';
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
    @InjectModel(NewsReaction.name)
    private readonly reactionModel: Model<NewsReactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private async validateActiveUser(userId: string): Promise<UserDocument> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.status !== UserStatus.ACTIVE || user.isActive === false) {
      throw new ForbiddenException('Sua conta precisa estar ativa e com o e-mail verificado para interagir.');
    }

    return user;
  }

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

    let article = await this.articleModel
      .findOne({
        slug: cleanSlug,
        ...publishCondition,
      })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    let isRedirect = false;

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

    const combined = [...mainArticles, ...secondaryArticles, ...remainingFeatured].slice(0, limit);
    return combined.map((d) => this.mapArticle(d));
  }

  async findRelated(slugOrId: string, limit = 3) {
    const publishCondition = this.getPublicPublishCondition();
    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article) return [];

    const related = await this.articleModel
      .find({
        ...publishCondition,
        _id: { $ne: article._id },
        category: article.category,
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatarUrl')
      .exec();

    return related.map((d) => this.mapArticle(d));
  }

  async findAllCategories() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();

    return categories.map((c) => this.mapCategory(c));
  }

  async getUserReaction(slugOrId: string, userId: string) {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return { userReaction: null };
    }

    const article = await this.articleModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(Types.ObjectId.isValid(slugOrId) ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
      ],
      isActive: true,
    });

    if (!article) {
      return { userReaction: null };
    }

    const existing = await this.reactionModel.findOne({
      article: article._id,
      user: new Types.ObjectId(userId),
    });

    return {
      userReaction: existing ? existing.type : null,
    };
  }

  async reactToArticle(slugOrId: string, userId: string, type: NewsReactionType) {
    await this.validateActiveUser(userId);

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

    const userObjectId = new Types.ObjectId(userId);
    const existing = await this.reactionModel.findOne({
      article: article._id,
      user: userObjectId,
    });

    let userReaction: string | null = null;

    if (existing && existing.type === type) {
      // Toggle off: desmarca reação já existente
      await this.reactionModel.deleteOne({ _id: existing._id });
      await this.articleModel.updateOne(
        { _id: article._id, [`reactions.${type}`]: { $gt: 0 } },
        { $inc: { [`reactions.${type}`]: -1 } },
      );
      userReaction = null;
    } else if (existing) {
      // Troca de reação: decrementa anterior e incrementa nova
      const previousType = existing.type;
      existing.type = type;
      await existing.save();

      await this.articleModel.updateOne(
        { _id: article._id, [`reactions.${previousType}`]: { $gt: 0 } },
        { $inc: { [`reactions.${previousType}`]: -1 } },
      );
      await this.articleModel.updateOne(
        { _id: article._id },
        { $inc: { [`reactions.${type}`]: 1 } },
      );
      userReaction = type;
    } else {
      // Primeira reação do usuário para esta matéria
      await this.reactionModel.create({
        article: article._id,
        user: userObjectId,
        type,
      });
      await this.articleModel.updateOne(
        { _id: article._id },
        { $inc: { [`reactions.${type}`]: 1 } },
      );
      userReaction = type;
    }

    const updated = await this.articleModel.findById(article._id).select('reactions').lean();
    const raw = (updated as any)?.reactions || { wolf: 0, fire: 0, clap: 0, heart: 0 };

    return {
      reactions: {
        wolf: Math.max(0, raw.wolf || 0),
        fire: Math.max(0, raw.fire || 0),
        clap: Math.max(0, raw.clap || 0),
        heart: Math.max(0, raw.heart || 0),
      },
      userReaction,
    };
  }

  async getComments(slugOrId: string, page = 1, limit = 10) {
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

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      article: article._id,
      isActive: true,
      status: NewsCommentStatus.ACTIVE,
    };

    const [comments, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('author', 'firstName lastName avatar avatarUrl role')
        .exec(),
      this.commentModel.countDocuments(filter).exec(),
    ]);

    return {
      data: comments.map((c) => ({
        _id: c._id.toString(),
        id: c._id.toString(),
        content: c.content,
        createdAt: (c as any).createdAt,
        author: c.author,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
      hasMore: safePage * safeLimit < total,
    };
  }

  async addComment(slugOrId: string, userId: string, content: string) {
    await this.validateActiveUser(userId);

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
      author: populated.author as any,
    };
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    await this.validateActiveUser(userId);

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
