import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { NewsStatus } from './schemas/news-article.schema.js';

describe('NewsService', () => {
  let service: NewsService;
  let mockArticleModel: any;
  let mockCategoryModel: any;

  beforeEach(() => {
    mockArticleModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
    };

    mockCategoryModel = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    service = new NewsService(mockArticleModel, mockCategoryModel);
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
});

