import { Model, Types } from 'mongoose';
import { NewsArticleDocument, NewsFeaturedSlot, NewsStatus } from '../schemas/news-article.schema.js';
import { UpdateShowcaseDto } from '../dto/update-showcase.dto.js';
import { BadRequestException } from '@nestjs/common';

export class NewsShowcaseHelper {
  static async getShowcase(articleModel: Model<NewsArticleDocument>) {
    const publishCondition = {
      isActive: true,
      status: NewsStatus.PUBLISHED,
    };

    // 1. Manchetão Principal
    const mainArticle = await articleModel
      .findOne({
        ...publishCondition,
        featuredSlot: NewsFeaturedSlot.MAIN,
      })
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatar avatarUrl')
      .lean()
      .exec();

    const mainId = mainArticle?._id ? (mainArticle._id as any).toString() : null;

    // 2. Destaques Secundários (máx 2)
    const secondaryArticles = await articleModel
      .find({
        ...publishCondition,
        ...(mainId ? { _id: { $ne: mainArticle?._id } } : {}),
        featuredSlot: NewsFeaturedSlot.SECONDARY,
      })
      .sort({ publishedAt: -1 })
      .limit(2)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatar avatarUrl')
      .lean()
      .exec();

    const featuredIds: any[] = [];
    if (mainArticle?._id) featuredIds.push(mainArticle._id);
    secondaryArticles.forEach((a) => featuredIds.push(a._id));

    // 3. Matérias Publicadas Disponíveis (não estão no Manchetão nem no Secundário)
    const availableArticles = await articleModel
      .find({
        ...publishCondition,
        _id: { $nin: featuredIds },
      })
      .sort({ publishedAt: -1 })
      .limit(30)
      .populate('category', 'name slug')
      .populate('author', 'firstName lastName avatar avatarUrl')
      .lean()
      .exec();

    const mapDoc = (doc: any) => {
      if (!doc) return null;
      return {
        ...doc,
        _id: doc._id?.toString ? doc._id.toString() : String(doc._id),
        id: doc._id?.toString ? doc._id.toString() : String(doc.id || doc._id),
      };
    };

    return {
      main: mapDoc(mainArticle),
      secondary: secondaryArticles.map(mapDoc),
      available: availableArticles.map(mapDoc),
    };
  }

  static async updateShowcase(
    articleModel: Model<NewsArticleDocument>,
    dto: UpdateShowcaseDto,
  ) {
    const secondaryIds = (dto.secondaryIds || []).filter(Boolean);
    const mainId = dto.mainId || null;

    if (secondaryIds.length > 2) {
      throw new BadRequestException('A vitrine suporta no máximo 2 destaques secundários.');
    }

    if (mainId && secondaryIds.includes(mainId)) {
      throw new BadRequestException('Uma matéria não pode ser Manchetão e Destaque Secundário ao mesmo tempo.');
    }

    const currentFeaturedIds: Types.ObjectId[] = [];
    if (mainId && Types.ObjectId.isValid(mainId)) {
      currentFeaturedIds.push(new Types.ObjectId(mainId));
    }
    for (const sid of secondaryIds) {
      if (Types.ObjectId.isValid(sid)) {
        currentFeaturedIds.push(new Types.ObjectId(sid));
      }
    }

    // 1. Desmarca qualquer matéria que deixou de fazer parte da vitrine
    await articleModel.updateMany(
      {
        _id: { $nin: currentFeaturedIds },
        featuredSlot: { $in: [NewsFeaturedSlot.MAIN, NewsFeaturedSlot.SECONDARY] },
        isActive: true,
      },
      {
        $set: {
          featuredSlot: NewsFeaturedSlot.NONE,
          isFeatured: false,
        },
      },
    );

    // 2. Define o Manchetão Principal
    if (mainId && Types.ObjectId.isValid(mainId)) {
      await articleModel.updateOne(
        { _id: new Types.ObjectId(mainId), isActive: true },
        {
          $set: {
            featuredSlot: NewsFeaturedSlot.MAIN,
            isFeatured: true,
          },
        },
      );
    }

    // 3. Define os Destaques Secundários
    if (secondaryIds.length > 0) {
      await articleModel.updateMany(
        {
          _id: { $in: secondaryIds.map((id) => new Types.ObjectId(id)) },
          isActive: true,
        },
        {
          $set: {
            featuredSlot: NewsFeaturedSlot.SECONDARY,
            isFeatured: true,
          },
        },
      );
    }

    return {
      success: true,
      message: 'Vitrine da capa atualizada com sucesso.',
    };
  }

  static async getCurrentMain(articleModel: Model<NewsArticleDocument>) {
    const main = await articleModel
      .findOne({
        isActive: true,
        status: NewsStatus.PUBLISHED,
        featuredSlot: NewsFeaturedSlot.MAIN,
      })
      .select('_id title slug coverImage publishedAt')
      .lean()
      .exec();

    if (!main) return null;

    return {
      _id: (main._id as any).toString(),
      id: (main._id as any).toString(),
      title: main.title,
      slug: main.slug,
      coverImage: main.coverImage,
      publishedAt: (main as any).publishedAt,
    };
  }
}

