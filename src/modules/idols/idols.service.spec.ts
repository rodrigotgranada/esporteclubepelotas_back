import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { IdolsService } from './idols.service.js';
import { IdolCategory } from './schemas/idol.schema.js';

describe('IdolsService (Public)', () => {
  let service: IdolsService;
  let mockIdolModel: any;
  let mockSystemModulesService: any;

  beforeEach(() => {
    mockIdolModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockSystemModulesService = {
      isModuleActive: vi.fn().mockResolvedValue(true),
    };

    service = new IdolsService(mockIdolModel, mockSystemModulesService);
  });

  describe('findAll', () => {
    it('should return paginated idols when module is active', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Flávio Minuano',
            nickname: 'Minuano',
            slug: 'flavio-minuano',
            category: IdolCategory.PLAYER,
            startYear: 1960,
            isFeatured: true,
            isActive: true,
          },
        ]),
      };

      mockIdolModel.find.mockReturnValue(mockQuery);
      mockIdolModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const res = await service.findAll({ page: 1, limit: 12 });

      expect(res.isModuleActive).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.data[0].nickname).toBe('Minuano');
    });

    it('should return empty list when idols module is inactive in SystemModule', async () => {
      mockSystemModulesService.isModuleActive.mockResolvedValue(false);

      const res = await service.findAll({ page: 1, limit: 12 });

      expect(res.isModuleActive).toBe(false);
      expect(res.data).toHaveLength(0);
      expect(res.total).toBe(0);
    });
  });

  describe('findBySlug', () => {
    it('should return idol profile by slug', async () => {
      mockIdolModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          name: 'Flávio Minuano',
          slug: 'flavio-minuano',
          category: IdolCategory.PLAYER,
          startYear: 1960,
          biography: 'Lenda do Lobo',
          isActive: true,
        }),
      });

      const res = await service.findBySlug('flavio-minuano');
      expect(res.slug).toBe('flavio-minuano');
      expect(res.name).toBe('Flávio Minuano');
    });

    it('should throw NotFoundException if idol is not found', async () => {
      mockIdolModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(service.findBySlug('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findFeatured', () => {
    it('should return top featured idols', async () => {
      mockIdolModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: '1',
            name: 'Ídolo 1',
            isFeatured: true,
            isActive: true,
          },
        ]),
      });

      const res = await service.findFeatured(4);
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Ídolo 1');
    });
  });
});
