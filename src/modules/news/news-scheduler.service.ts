import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsArticle, NewsArticleDocument, NewsStatus } from './schemas/news-article.schema.js';

@Injectable()
export class NewsSchedulerService {
  private readonly logger = new Logger(NewsSchedulerService.name);

  constructor(
    @InjectModel(NewsArticle.name)
    private readonly articleModel: Model<NewsArticleDocument>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledNewsPublishing() {
    const now = new Date();
    try {
      const result = await this.articleModel.updateMany(
        {
          status: NewsStatus.SCHEDULED,
          publishedAt: { $lte: now },
          isActive: true,
        },
        {
          $set: { status: NewsStatus.PUBLISHED },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(
          `[NewsScheduler] Publicadas ${result.modifiedCount} matéria(s) agendada(s) automaticamente.`,
        );
      }
    } catch (err) {
      this.logger.error({ err }, '[NewsScheduler] Erro ao reconciliar matérias agendadas.');
    }
  }
}
