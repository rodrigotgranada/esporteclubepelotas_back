import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SquadsAdminService } from './squads-admin.service.js';
import { SquadCategory, SquadMemberRole, SquadSector } from './schemas/squad.schema.js';

describe('SquadsAdminService', () => {
  let service: SquadsAdminService;
  let mockSquadModel: any;
  let mockStorageProvider: any;

  beforeEach(() => {
    mockSquadModel = {
      find: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockStorageProvider = {
      uploadFile: vi.fn().mockResolvedValue('https://storage.com/cover.webp'),
    };

    service = new SquadsAdminService(mockSquadModel, mockStorageProvider);
  });

  describe('create', () => {
    it('should create squad and unset other isCurrent squads when isCurrent is true', async () => {
      mockSquadModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const dto = {
        year: 2025,
        category: SquadCategory.PROFESSIONAL,
        seasonName: 'Gauchão 2025',
        isCurrent: true,
      };

      mockSquadModel.create.mockResolvedValue({
        _id: '607f1f77bcf86cd799439022',
        ...dto,
        members: [],
        isActive: true,
      });

      const res = await service.create(dto as any, 'user123');

      expect(res?.year).toBe(2025);
      expect(mockSquadModel.updateMany).toHaveBeenCalledWith(
        { category: SquadCategory.PROFESSIONAL, isCurrent: true },
        { $set: { isCurrent: false } },
      );
      expect(mockSquadModel.create).toHaveBeenCalled();
    });
  });

  describe('setMembers', () => {
    it('should update squad member list with populated return', async () => {
      const validSquadId = '607f1f77bcf86cd799439022';
      const validAthleteId = '507f1f77bcf86cd799439011';

      mockSquadModel.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              _id: validSquadId,
              year: 2025,
              members: [
                {
                  athlete: {
                    _id: validAthleteId,
                    name: 'Walter',
                  },
                  jerseyNumber: 9,
                  sector: SquadSector.FORWARD,
                  role: SquadMemberRole.STARTER,
                },
              ],
            }),
          }),
        }),
      });

      const res = await service.setMembers(validSquadId, {
        members: [
          {
            athleteId: validAthleteId,
            jerseyNumber: 9,
            sector: SquadSector.FORWARD,
            role: SquadMemberRole.STARTER,
          },
        ],
      });

      expect(res?.members).toHaveLength(1);
      expect(res?.members[0].jerseyNumber).toBe(9);
    });
  });

  describe('remove', () => {
    it('should soft delete squad', async () => {
      const validSquadId = '607f1f77bcf86cd799439022';
      mockSquadModel.findByIdAndUpdate.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            _id: validSquadId,
            isActive: false,
          }),
        }),
      });

      const res = await service.remove(validSquadId);

      expect(res.success).toBe(true);
      expect(mockSquadModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSquadId,
        { $set: { isActive: false } },
        { new: true },
      );
    });
  });
});
