import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { NewsStatus } from './schemas/news-article.schema.js';
import { UserStatus } from '../users/schemas/user.schema.js';

describe('NewsService', () => {
  let service: NewsService;
  let mockArticleModel: any;
  let mockCategoryModel: any;
  let mockCommentModel: any;
  let mockReactionModel: any;
  let mockUserModel: any;

  const validUserId = '507f1f77bcf86cd799439011';
  const activeUser = {
    _id: validUserId,
    status: UserStatus.ACTIVE,
    isActive: true,
  };

  beforeEach(() => {
    mockArticleModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
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

    mockReactionModel = {
      findOne: vi.fn(),
      create: vi.fn(),
      deleteOne: vi.fn(),
    };

    mockUserModel = {
      findById: vi.fn().mockResolvedValue(activeUser),
    };

    service = new NewsService(
      mockArticleModel,
      mockCategoryModel,
      mockCommentModel,
      mockReactionModel,
      mockUserModel,
    );
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
        .mockReturnValueOnce(createQuery([mainArticle]))
        .mockReturnValueOnce(createQuery([secondaryArticle]))
        .mockReturnValueOnce(createQuery([]))
        .mockReturnValueOnce(createQuery([]));

      const result = await service.findFeatured(3);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Manchetão Principal');
      expect(result[1].title).toBe('Destaque Secundário');
    });
  });

  describe('reactToArticle', () => {
    it('should increment reaction count for first reaction', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        slug: 'materia-1',
        allowReactions: true,
      });

      mockReactionModel.findOne.mockResolvedValue(null);

      mockArticleModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            reactions: { wolf: 1, fire: 0, clap: 0, heart: 0 },
          }),
        }),
      });

      const res = await service.reactToArticle('materia-1', validUserId, 'wolf' as any);
      expect(res.reactions.wolf).toBe(1);
      expect(res.userReaction).toBe('wolf');
      expect(mockReactionModel.create).toHaveBeenCalled();
    });

    it('should toggle off reaction when clicking the same reaction', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        slug: 'materia-1',
        allowReactions: true,
      });

      mockReactionModel.findOne.mockResolvedValue({
        _id: 'reac-1',
        type: 'wolf',
      });

      mockArticleModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            reactions: { wolf: 0, fire: 0, clap: 0, heart: 0 },
          }),
        }),
      });

      const res = await service.reactToArticle('materia-1', validUserId, 'wolf' as any);
      expect(res.reactions.wolf).toBe(0);
      expect(res.userReaction).toBeNull();
      expect(mockReactionModel.deleteOne).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user status is PENDING', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: validUserId,
        status: UserStatus.PENDING,
        isActive: true,
      });

      await expect(
        service.reactToArticle('materia-1', validUserId, 'wolf' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addComment', () => {
    it('should create comment and populate author when account is active', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
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

      const res = await service.addComment('materia-1', validUserId, 'Belo jogo do Pelotas!');
      expect(res.content).toBe('Belo jogo do Pelotas!');
      expect((res.author as any).firstName).toBe('Torcedor');
    });

    it('should throw ForbiddenException if user account is not active', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: validUserId,
        status: UserStatus.INACTIVE,
        isActive: false,
      });

      await expect(
        service.addComment('materia-1', validUserId, 'Texto teste'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getComments', () => {
    it('should return paginated comments with total and hasMore', async () => {
      mockArticleModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        slug: 'materia-1',
      });

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: 'com-1',
            content: 'Excelente!',
            createdAt: new Date(),
            author: { firstName: 'Torcedor' },
          },
        ]),
      };

      mockCommentModel.find.mockReturnValue(mockQuery);
      mockCommentModel.countDocuments = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const res = await service.getComments('materia-1', 1, 10);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.hasMore).toBe(false);
    });
  });
});
