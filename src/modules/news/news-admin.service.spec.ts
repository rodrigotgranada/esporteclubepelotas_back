import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsAdminService } from './news-admin.service.js';
import { NewsStatus } from './schemas/news-article.schema.js';

describe('NewsAdminService - Slugs & Lifecycle', () => {
  let service: NewsAdminService;
  let mockArticleModel: any;
  let mockCategoryModel: any;
  let mockStorageProvider: any;

  beforeEach(() => {
    mockArticleModel = {
      find: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      findOne: vi.fn(),
    };
    mockCategoryModel = {
      findOne: vi.fn(),
    };
    mockStorageProvider = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
    };

    service = new NewsAdminService(
      mockArticleModel,
      mockCategoryModel,
      mockStorageProvider,
    );
  });

  describe('update slug protection and previousSlugs', () => {
    it('should archive previous slug when editor updates slug explicitly', async () => {
      const existingArticle = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        title: 'Título Antigo',
        slug: 'slug-antigo',
        previousSlugs: [],
        status: NewsStatus.PUBLISHED,
        toObject: () => ({
          _id: '60d5ec49f1b2c8b1f8e4e1a1',
          title: 'Título Antigo',
          slug: 'slug-antigo',
          previousSlugs: [],
          status: NewsStatus.PUBLISHED,
        }),
      };

      // Mock adminFindById
      mockArticleModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(existingArticle),
      });

      // Mock generateUniqueSlug (find matching slugs)
      mockArticleModel.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });

      // Mock findByIdAndUpdate
      mockArticleModel.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...existingArticle,
          slug: 'slug-novo',
          previousSlugs: ['slug-antigo'],
          toObject: () => ({
            ...existingArticle,
            slug: 'slug-novo',
            previousSlugs: ['slug-antigo'],
          }),
        }),
      });

      const updated = await service.update('60d5ec49f1b2c8b1f8e4e1a1', {
        slug: 'slug-novo',
      });

      expect(mockArticleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '60d5ec49f1b2c8b1f8e4e1a1',
        expect.objectContaining({
          slug: 'slug-novo',
          previousSlugs: ['slug-antigo'],
        }),
        { new: true },
      );
      expect(updated.slug).toBe('slug-novo');
    });

    it('should NOT regenerate slug on title change if article is already PUBLISHED', async () => {
      const existingArticle = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        title: 'Título Antigo',
        slug: 'slug-antigo',
        previousSlugs: [],
        status: NewsStatus.PUBLISHED,
        toObject: () => ({
          _id: '60d5ec49f1b2c8b1f8e4e1a1',
          title: 'Título Antigo',
          slug: 'slug-antigo',
          previousSlugs: [],
          status: NewsStatus.PUBLISHED,
        }),
      };

      mockArticleModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(existingArticle),
      });

      mockArticleModel.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...existingArticle,
          title: 'Título Atualizado Sem Mexer no Slug',
          toObject: () => ({
            ...existingArticle,
            title: 'Título Atualizado Sem Mexer no Slug',
          }),
        }),
      });

      await service.update('60d5ec49f1b2c8b1f8e4e1a1', {
        title: 'Título Atualizado Sem Mexer no Slug',
      });

      // slug must remain slug-antigo
      expect(mockArticleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '60d5ec49f1b2c8b1f8e4e1a1',
        expect.objectContaining({
          slug: 'slug-antigo',
          title: 'Título Atualizado Sem Mexer no Slug',
        }),
        { new: true },
      );
    });

    it('should demote other main articles when setting featuredSlot to MAIN', async () => {
      mockArticleModel.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 1 });

      const existingArticle = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        title: 'Nova Matéria Destaque',
        slug: 'nova-materia-destaque',
        status: NewsStatus.PUBLISHED,
        toObject: () => ({
          _id: '60d5ec49f1b2c8b1f8e4e1a1',
          title: 'Nova Matéria Destaque',
          slug: 'nova-materia-destaque',
        }),
      };

      mockArticleModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(existingArticle),
      });

      mockArticleModel.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(existingArticle),
      });

      await service.update('60d5ec49f1b2c8b1f8e4e1a1', {
        featuredSlot: 'MAIN' as any,
        isPinned: true,
        reporterName: 'Gustavo Freitas',
        photographerName: 'Lucas Silva',
      });

      expect(mockArticleModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          featuredSlot: 'MAIN',
          isActive: true,
        }),
        { $set: { featuredSlot: 'SECONDARY' } },
      );

      expect(mockArticleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '60d5ec49f1b2c8b1f8e4e1a1',
        expect.objectContaining({
          isFeatured: true,
          featuredSlot: 'MAIN',
          isPinned: true,
          reporterName: 'Gustavo Freitas',
          photographerName: 'Lucas Silva',
        }),
        { new: true },
      );
    });
  });
});

