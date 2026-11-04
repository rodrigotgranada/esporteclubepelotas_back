import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdolsAdminService } from './idols-admin.service.js';
import { IdolCategory } from './schemas/idol.schema.js';

describe('IdolsAdminService (Admin)', () => {
  let service: IdolsAdminService;
  let mockIdolModel: any;
  let mockStorageProvider: any;

  beforeEach(() => {
    mockIdolModel = {
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      }),
      findById: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockStorageProvider = {
      uploadFile: vi.fn().mockResolvedValue('https://storage.com/foto.webp'),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    service = new IdolsAdminService(mockIdolModel, mockStorageProvider);
  });

  describe('create', () => {
    it('should create an idol with auto-generated unique slug', async () => {
      const dto: any = {
        name: 'Flávio Minuano',
        nickname: 'Minuano',
        category: IdolCategory.PLAYER,
        startYear: 1960,
        biography: 'Grande artilheiro',
      };

      const createdDoc = {
        _id: '507f1f77bcf86cd799439011',
        ...dto,
        slug: 'minuano',
        isActive: true,
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          ...dto,
          slug: 'minuano',
          isActive: true,
        }),
      };

      mockIdolModel.create.mockResolvedValue(createdDoc);

      const res = await service.create(dto, '507f1f77bcf86cd799439099');

      expect(mockIdolModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Flávio Minuano',
          slug: 'minuano',
          category: IdolCategory.PLAYER,
        }),
      );
      expect(res.slug).toBe('minuano');
    });
  });

  describe('update', () => {
    it('should update idol fields and update lastEditedBy', async () => {
      const existingIdol = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Antigo Nome',
        slug: 'antigo-nome',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      mockIdolModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(existingIdol),
      });

      const res = await service.update(
        '507f1f77bcf86cd799439011',
        { name: 'Novo Nome' },
        '507f1f77bcf86cd799439099',
      );

      expect(existingIdol.name).toBe('Novo Nome');
      expect(existingIdol.save).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      const existingIdol = {
        _id: '507f1f77bcf86cd799439011',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      mockIdolModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(existingIdol),
      });

      const res = await service.softDelete('507f1f77bcf86cd799439011');
      expect(existingIdol.isActive).toBe(false);
      expect(res.success).toBe(true);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo file to storage and update photoUrl', async () => {
      const existingIdol = {
        _id: '507f1f77bcf86cd799439011',
        photoUrl: '',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      mockIdolModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(existingIdol),
      });

      const mockFile = {
        originalname: 'minuano.webp',
        buffer: Buffer.from('test'),
        mimetype: 'image/webp',
      };

      const res = await service.uploadPhoto('507f1f77bcf86cd799439011', mockFile);

      expect(mockStorageProvider.uploadFile).toHaveBeenCalled();
      expect(existingIdol.photoUrl).toBe('https://storage.com/foto.webp');
      expect(res.photoUrl).toBe('https://storage.com/foto.webp');
    });
  });
});
