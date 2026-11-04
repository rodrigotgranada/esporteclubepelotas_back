import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SquadsService } from './squads.service.js';
import { SquadCategory, SquadMemberRole, SquadSector } from './schemas/squad.schema.js';

describe('SquadsService (Public)', () => {
  let service: SquadsService;
  let mockSquadModel: any;
  let mockSystemModulesService: any;

  beforeEach(() => {
    mockSquadModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      distinct: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockSystemModulesService = {
      isModuleActive: vi.fn().mockResolvedValue(true),
    };

    service = new SquadsService(mockSquadModel, mockSystemModulesService);
  });

  describe('getSeasons', () => {
    it('should return available years and categories', async () => {
      mockSquadModel.distinct.mockImplementation((field: string) => ({
        exec: vi.fn().mockResolvedValue(field === 'year' ? [2025, 2024] : ['PROFESSIONAL', 'SUB_20']),
      }));

      const res = await service.getSeasons();

      expect(res.years).toEqual([2025, 2024]);
      expect(res.categories).toEqual(['PROFESSIONAL', 'SUB_20']);
      expect(res.isModuleActive).toBe(true);
    });
  });

  describe('getCurrent', () => {
    it('should return squad with members grouped by tactical sectors', async () => {
      const mockSquad = {
        _id: '607f1f77bcf86cd799439022',
        year: 2025,
        category: SquadCategory.PROFESSIONAL,
        seasonName: 'Temporada 2025',
        coachName: 'Ariel Lanzini',
        isCurrent: true,
        members: [
          {
            athlete: {
              _id: '507f1f77bcf86cd799439001',
              name: 'Jacsson',
              slug: 'jacsson',
              primaryPosition: 'Goleiro',
            },
            jerseyNumber: 1,
            sector: SquadSector.GOALKEEPER,
            role: SquadMemberRole.STARTER,
            order: 1,
          },
          {
            athlete: {
              _id: '507f1f77bcf86cd799439002',
              name: 'Heverton',
              slug: 'heverton',
              primaryPosition: 'Zagueiro',
            },
            jerseyNumber: 4,
            sector: SquadSector.DEFENDER,
            role: SquadMemberRole.CAPTAIN,
            order: 1,
          },
        ],
      };

      mockSquadModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockSquad),
          }),
        }),
      });

      const res = await service.getCurrent(SquadCategory.PROFESSIONAL);

      expect(res).toBeDefined();
      expect(res?.sectors.goalkeepers).toHaveLength(1);
      expect(res?.sectors.defenders).toHaveLength(1);
      expect(res?.sectors.goalkeepers[0].jerseyNumber).toBe(1);
      expect(res?.sectors.defenders[0].role).toBe(SquadMemberRole.CAPTAIN);
    });
  });

  describe('getByYearAndCategory', () => {
    it('should throw NotFoundException when squad does not exist', async () => {
      mockSquadModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.getByYearAndCategory(1910, SquadCategory.PROFESSIONAL)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

