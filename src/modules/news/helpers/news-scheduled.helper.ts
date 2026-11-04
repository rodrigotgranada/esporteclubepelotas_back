import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  NewsArticleDocument,
  NewsFeaturedSlot,
  NewsStatus,
} from '../schemas/news-article.schema.js';
import { NewsMapperHelper } from './news-mapper.helper.js';

export class NewsScheduledHelper {
  /**
   * Lista todas as matérias agendadas que ainda não foram publicadas (data futura),
   * ordenadas cronologicamente da mais próxima para a mais distante.
   */
  static async getScheduledArticles(articleModel: Model<NewsArticleDocument>) {
    const now = new Date();

    const articles = await articleModel
      .find({
        isActive: true,
        status: NewsStatus.SCHEDULED,
        publishedAt: { $gt: now },
      })
      .sort({ publishedAt: 1 })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName email avatar avatarUrl')
      .exec();

    const mapped = articles.map((art) => NewsMapperHelper.mapArticle(art));

    return {
      data: mapped,
      total: mapped.length,
    };
  }

  /**
   * Publica imediatamente uma matéria agendada no portal sem esperar o horário agendado.
   */
  static async publishNow(articleModel: Model<NewsArticleDocument>, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const article = await articleModel.findById(id).exec();
    if (!article || !article.isActive) {
      throw new NotFoundException('Matéria agendada não encontrada.');
    }

    // Se a matéria a ser publicada for Manchetão Principal, desocupa o manchetão anterior
    if (article.featuredSlot === NewsFeaturedSlot.MAIN) {
      await articleModel.updateMany(
        {
          _id: { $ne: article._id },
          isActive: true,
          status: NewsStatus.PUBLISHED,
          featuredSlot: NewsFeaturedSlot.MAIN,
        },
        {
          $set: {
            featuredSlot: NewsFeaturedSlot.NONE,
            isFeatured: false,
          },
        },
      );
    }

    article.status = NewsStatus.PUBLISHED;
    article.publishedAt = new Date();

    await article.save();

    await article.populate([
      { path: 'category', select: 'name slug' },
      { path: 'author', select: 'firstName lastName email avatar avatarUrl' },
    ]);

    return {
      data: NewsMapperHelper.mapArticle(article),
      message: 'Matéria publicada com sucesso no portal!',
    };
  }
}
