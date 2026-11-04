import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsAdminService } from './news-admin.service.js';
import { NewsStatus, NewsFeaturedSlot } from './schemas/news-article.schema.js';
import { NewsCommentStatus } from './schemas/news-comment.schema.js';

describe('NewsAdminService - Slugs, Lifecycle & Moderation', () => {
  let service: NewsAdminService;
  let mockArticleModel: any;
  let mockCategoryModel: any;
  let mockCommentModel: any;
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
    mockCommentModel = {
      find: vi.fn(),
      findById: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockStorageProvider = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
    };

    service = new NewsAdminService(
      mockArticleModel,
      mockCategoryModel,
      mockCommentModel,
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

      mockArticleModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(existingArticle),
      });

      mockArticleModel.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });

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

      expect(mockArticleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '60d5ec49f1b2c8b1f8e4e1a1',
        expect.objectContaining({
          slug: 'slug-antigo',
          title: 'Título Atualizado Sem Mexer no Slug',
        }),
        { new: true },
      );
    });

    it('should clear other main articles to NONE when setting featuredSlot to MAIN', async () => {
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
        { $set: { featuredSlot: NewsFeaturedSlot.NONE, isFeatured: false } },
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

  describe('Comments Moderation', () => {
    it('should list comments with author and article populated', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: 'com-1',
            content: 'Ótima matéria!',
            status: NewsCommentStatus.ACTIVE,
            createdAt: new Date(),
            article: { title: 'Notícia 1' },
            author: { firstName: 'Torcedor' },
          },
        ]),
      };

      mockCommentModel.find.mockReturnValue(mockQuery);
      mockCommentModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const res = await service.adminFindComments({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.data[0].content).toBe('Ótima matéria!');
    });

    it('should update comment status between ACTIVE and HIDDEN', async () => {
      const mockComment = {
        _id: '507f1f77bcf86cd799439011',
        status: NewsCommentStatus.ACTIVE,
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCommentModel.findById.mockResolvedValue(mockComment);

      const res = await service.adminUpdateCommentStatus(
        '507f1f77bcf86cd799439011',
        NewsCommentStatus.HIDDEN,
      );

      expect(mockComment.status).toBe(NewsCommentStatus.HIDDEN);
      expect(res.status).toBe(NewsCommentStatus.HIDDEN);
      expect(mockComment.save).toHaveBeenCalled();
    });
  });
});
