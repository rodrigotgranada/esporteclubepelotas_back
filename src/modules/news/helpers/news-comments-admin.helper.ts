import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { NewsCommentDocument, NewsCommentStatus } from '../schemas/news-comment.schema.js';

export class NewsCommentsAdminHelper {
  static async adminFindComments(
    commentModel: Model<NewsCommentDocument>,
    query: {
      page?: number;
      limit?: number;
      status?: NewsCommentStatus;
      search?: string;
      articleId?: string;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isActive: true,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.articleId && Types.ObjectId.isValid(query.articleId)) {
      filter.article = new Types.ObjectId(query.articleId);
    }

    if (query.search) {
      filter.content = new RegExp(query.search.trim(), 'i');
    }

    const [comments, total] = await Promise.all([
      commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('article', 'title slug coverImage')
        .populate({
          path: 'author',
          select: 'firstName lastName email avatar avatarUrl role',
          populate: { path: 'role', select: 'name' },
        })
        .lean()
        .exec(),
      commentModel.countDocuments(filter).exec(),
    ]);

    return {
      data: comments.map((c: any) => ({
        _id: c._id.toString(),
        id: c._id.toString(),
        content: c.content,
        status: c.status,
        createdAt: c.createdAt,
        article: c.article
          ? {
              _id: c.article._id?.toString() || '',
              id: c.article._id?.toString() || '',
              title: c.article.title,
              slug: c.article.slug,
              coverImage: c.article.coverImage,
            }
          : null,
        author: c.author
          ? {
              _id: c.author._id?.toString() || '',
              id: c.author._id?.toString() || '',
              firstName: c.author.firstName || 'Torcedor',
              lastName: c.author.lastName || '',
              email: c.author.email || '',
              avatar: c.author.avatar || c.author.avatarUrl || '',
              avatarUrl: c.author.avatarUrl || c.author.avatar || '',
              role: c.author.role?.name || (typeof c.author.role === 'string' ? c.author.role : 'TORCEDOR'),
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async adminUpdateCommentStatus(
    commentModel: Model<NewsCommentDocument>,
    commentId: string,
    status: NewsCommentStatus,
  ) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    const comment = await commentModel.findById(commentId);
    if (!comment || !comment.isActive) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    comment.status = status;
    await comment.save();

    return {
      _id: comment._id.toString(),
      id: comment._id.toString(),
      status: comment.status,
      message: 'Status do comentário atualizado com sucesso.',
    };
  }

  static async adminDeleteComment(
    commentModel: Model<NewsCommentDocument>,
    commentId: string,
  ) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    const comment = await commentModel.findById(commentId);
    if (!comment || !comment.isActive) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    comment.isActive = false;
    await comment.save();

    return { success: true, message: 'Comentário excluído com sucesso.' };
  }
}

