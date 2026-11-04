import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { NewsStatus } from './schemas/news-article.schema.js';

describe('NewsService', () => {
  let service: NewsService;
  let mockArticleModel: any;
  let mockCategoryModel: any;
  let mockCommentModel: any;

  beforeEach(() => {
    mockArticleModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
    };

    mockCategoryModel = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockCommentModel = {
      find: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };

    service = new NewsService(mockArticleModel, mockCategoryModel, mockCommentModel);
  });

  describe('findBySlug', () => {
    it('should return article directly when primary slug matches', async () => {
      const mockDoc = {
        _id: '123',
        title: 'Vitória do Pelotas',
        slug: 'vitoria-do-pelotas',
        status: NewsStatus.PUBLISHED,
        toObject: () => ({ _id: '123', title: 'Vitória do Pelotas', slug: 'vitoria-do-pelotas' }),
      };

      const populateQuery = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockDoc),
      };

      mockArticleModel.findOne.mockReturnValue(populateQuery);

      const result = await service.findBySlug('vitoria-do-pelotas');
      expect(result).toBeDefined();
      expect(result.slug).toBe('vitoria-do-pelotas');
      expect((result as any)._redirectTo).toBeUndefined();
    });

    it('should return article with _redirectTo when found via previousSlugs', async () => {
      const mockDoc = {
        _id: '123',
        title: 'Novo Título do Pelotas',
        slug: 'novo-titulo-do-pelotas',
        previousSlugs: ['titulo-antigo-do-pelotas'],
        status: NewsStatus.PUBLISHED,
        toObject: () => ({
          _id: '123',
          title: 'Novo Título do Pelotas',
          slug: 'novo-titulo-do-pelotas',
          previousSlugs: ['titulo-antigo-do-pelotas'],
        }),
      };

      // 1st findOne (by slug) returns null
      // 2nd findOne (by previousSlugs) returns mockDoc
      const nullPopulate = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      };
      const foundPopulate = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockDoc),
      };

      mockArticleModel.findOne
        .mockReturnValueOnce(nullPopulate)
        .mockReturnValueOnce(foundPopulate);

      const result = await service.findBySlug('titulo-antigo-do-pelotas');
      expect(result).toBeDefined();
      expect(result.slug).toBe('novo-titulo-do-pelotas');
      expect((result as any)._redirectTo).toBe('novo-titulo-do-pelotas');
    });

    it('should throw NotFoundException if slug is neither current nor previous', async () => {
      const nullPopulate = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      };

      mockArticleModel.findOne
        .mockReturnValueOnce(nullPopulate)
        .mockReturnValueOnce(nullPopulate);

      await expect(service.findBySlug('slug-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findFeatured', () => {
    it('should prioritize MAIN headline and SECONDARY highlights', async () => {
      const mainArticle = {
        _id: 'm1',
        title: 'Manchetão Principal',
        featuredSlot: 'MAIN',
        toObject: () => ({ _id: 'm1', title: 'Manchetão Principal', featuredSlot: 'MAIN' }),
      };
      const secondaryArticle = {
        _id: 's1',
        title: 'Destaque Secundário',
        featuredSlot: 'SECONDARY',
        toObject: () => ({ _id: 's1', title: 'Destaque Secundário', featuredSlot: 'SECONDARY' }),
      };

      const createQuery = (result: any[]) => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(result),
      });

      mockArticleModel.find
        .mockReturnValueOnce(createQuery([mainArticle])) // mainArticles query
        .mockReturnValueOnce(createQuery([secondaryArticle])) // secondaryArticles query
        .mockReturnValueOnce(createQuery([])) // remaining featured
        .mockReturnValueOnce(createQuery([])); // recent fallback

      const result = await service.findFeatured(3);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Manchetão Principal');
      expect(result[1].title).toBe('Destaque Secundário');
    });
  });

  describe('reactToArticle', () => {
    it('should increment reaction count when reactions are allowed', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: 'art-1',
        slug: 'materia-1',
        allowReactions: true,
      });

      mockArticleModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          reactions: { wolf: 1, fire: 0, clap: 0, heart: 0 },
        }),
      });

      const res = await service.reactToArticle('materia-1', 'wolf');
      expect(res.reactions.wolf).toBe(1);
    });
  });

  describe('addComment', () => {
    it('should create comment and populate author when comments are allowed', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: 'art-1',
        slug: 'materia-1',
        allowComments: true,
      });

      const mockCommentDoc = {
        _id: 'com-1',
        content: 'Belo jogo do Pelotas!',
        populate: vi.fn().mockResolvedValue({
          _id: 'com-1',
          content: 'Belo jogo do Pelotas!',
          createdAt: new Date(),
          author: { firstName: 'Torcedor', lastName: 'X' },
        }),
      };

      mockCommentModel.create.mockResolvedValue(mockCommentDoc);

      const res = await service.addComment('materia-1', '507f1f77bcf86cd799439011', 'Belo jogo do Pelotas!');
      expect(res.content).toBe('Belo jogo do Pelotas!');
      expect(res.author.firstName).toBe('Torcedor');
    });
  });
});

