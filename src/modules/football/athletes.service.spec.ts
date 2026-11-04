import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AthletesService } from './athletes.service.js';
import { PreferredFoot } from './schemas/athlete.schema.js';

describe('AthletesService (Public)', () => {
  let service: AthletesService;
  let mockAthleteModel: any;
  let mockSquadModel: any;
  let mockSystemModulesService: any;

  beforeEach(() => {
    mockAthleteModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockSquadModel = {
      find: vi.fn(),
    };
    mockSystemModulesService = {
      isModuleActive: vi.fn().mockResolvedValue(true),
    };

    service = new AthletesService(mockAthleteModel, mockSquadModel, mockSystemModulesService);
  });

  describe('findAll', () => {
    it('should return paginated athletes when module is active', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Walter Henrique',
            nickname: 'Walter',
            slug: 'walter',
            primaryPosition: 'Centroavante',
            preferredFoot: PreferredFoot.RIGHT,
            isActive: true,
          },
        ]),
      };

      mockAthleteModel.find.mockReturnValue(mockQuery);
      mockAthleteModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const res = await service.findAll({ page: 1, limit: 20 });

      expect(res.isModuleActive).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.data[0]?.nickname).toBe('Walter');
    });

    it('should return empty list when football module is inactive', async () => {
      mockSystemModulesService.isModuleActive.mockResolvedValue(false);

      const res = await service.findAll({});

      expect(res.isModuleActive).toBe(false);
      expect(res.data).toHaveLength(0);
      expect(res.total).toBe(0);
    });
  });

  describe('findBySlug', () => {
    it('should return athlete details and squad seasons when found', async () => {
      const mockAthlete = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Walter Henrique',
        nickname: 'Walter',
        slug: 'walter',
        primaryPosition: 'Centroavante',
        birthDate: new Date('1989-07-22'),
        isActive: true,
      };

      mockAthleteModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockAthlete),
      });

      const mockSquads = [
        {
          _id: '607f1f77bcf86cd799439022',
          year: 2025,
          category: 'PROFESSIONAL',
          seasonName: 'Gauchão 2025',
          members: [
            {
              athlete: '507f1f77bcf86cd799439011',
              jerseyNumber: 9,
              sector: 'FORWARD',
              role: 'STARTER',
            },
          ],
        },
      ];

      mockSquadModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockSquads),
      });

      const res = await service.findBySlug('walter');

      expect(res.slug).toBe('walter');
      expect(res.nickname).toBe('Walter');
      expect(res.seasons).toHaveLength(1);
      expect(res.seasons[0].year).toBe(2025);
      expect(res.seasons[0].jerseyNumber).toBe(9);
    });

    it('should throw NotFoundException when athlete does not exist', async () => {
      mockAthleteModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(service.findBySlug('inexistente')).rejects.toThrow(NotFoundException);
    });
  });
});
