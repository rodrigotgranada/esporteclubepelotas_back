import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { NewsArticle, NewsArticleSchema } from './schemas/news-article.schema.js';
import { NewsCategory, NewsCategorySchema } from './schemas/news-category.schema.js';
import { NewsComment, NewsCommentSchema } from './schemas/news-comment.schema.js';
import { NewsService } from './news.service.js';
import { NewsAdminService } from './news-admin.service.js';
import { NewsSchedulerService } from './news-scheduler.service.js';
import { NewsController } from './news.controller.js';
import { NewsAdminController } from './news-admin.controller.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsArticle.name, schema: NewsArticleSchema },
      { name: NewsCategory.name, schema: NewsCategorySchema },
      { name: NewsComment.name, schema: NewsCommentSchema },
    ]),
    StorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NewsAdminController, NewsController],
  providers: [NewsService, NewsAdminService, NewsSchedulerService],
  exports: [NewsService, NewsAdminService],
})
export class NewsModule {}
