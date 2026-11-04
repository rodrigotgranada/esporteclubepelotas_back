import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AthletesAdminService } from './athletes-admin.service.js';
import { PreferredFoot } from './schemas/athlete.schema.js';

describe('AthletesAdminService', () => {
  let service: AthletesAdminService;
  let mockAthleteModel: any;
  let mockStorageProvider: any;

  beforeEach(() => {
    mockAthleteModel = {
      find: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockStorageProvider = {
      uploadFile: vi.fn().mockResolvedValue('https://storage.com/photo.webp'),
    };

    service = new AthletesAdminService(mockAthleteModel, mockStorageProvider);
  });

  describe('create', () => {
    it('should create an athlete and generate unique slug', async () => {
      mockAthleteModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      });

      const dto = {
        name: 'Walter Henrique',
        nickname: 'Walter',
        primaryPosition: 'Centroavante',
        preferredFoot: PreferredFoot.RIGHT,
      };

      mockAthleteModel.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...dto,
        slug: 'walter',
        isActive: true,
      });

      const res = await service.create(dto as any, 'user123');

      expect(res?.slug).toBe('walter');
      expect(mockAthleteModel.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete athlete by setting isActive to false', async () => {
      const validId = '507f1f77bcf86cd799439011';
      mockAthleteModel.findByIdAndUpdate.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          _id: validId,
          name: 'Walter Henrique',
          isActive: false,
        }),
      });

      const res = await service.remove(validId);

      expect(res.success).toBe(true);
      expect(mockAthleteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validId,
        { $set: { isActive: false } },
        { new: true },
      );
    });
  });

  describe('uploadPhoto', () => {
    it('should upload binary to storage and save photoUrl in athlete document', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const mockDoc = {
        _id: validId,
        name: 'Walter Henrique',
        photoUrl: '',
        save: vi.fn().mockResolvedValue(true),
      };

      mockAthleteModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const fakeFile: any = {
        buffer: Buffer.from('fake-image-bytes'),
        originalname: 'walter.webp',
        mimetype: 'image/webp',
      };

      const res = await service.uploadPhoto(validId, fakeFile);

      expect(res.photoUrl).toBe('https://storage.com/photo.webp');
      expect(mockStorageProvider.uploadFile).toHaveBeenCalled();
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
