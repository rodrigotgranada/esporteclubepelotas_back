import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';
import { ConflictException } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN } from '../../common/providers/storage/storage.interface.js';
import { MAIL_PROVIDER_TOKEN } from '../../common/providers/mail/mail.interface.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserModel = {
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

const mockVerificationCodeModel = {
  findOne: vi.fn(),
  create: vi.fn(),
};

const mockStorageProvider = {
  uploadFile: vi.fn(),
};

const mockMailProvider = {
  sendMail: vi.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('VerificationCode'),
          useValue: mockVerificationCodeModel,
        },
        {
          provide: STORAGE_PROVIDER_TOKEN,
          useValue: mockStorageProvider,
        },
        {
          provide: MAIL_PROVIDER_TOKEN,
          useValue: mockMailProvider,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWithAvatar', () => {
    it('should throw ConflictException if email exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ email: 'test@test.com' }),
      });

      await expect(
        service.createWithAvatar({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          cpf: '123',
          birthDate: new Date(),
          password: 'pass',
          phones: [],
          addresses: [],
        })
      ).rejects.toThrow(ConflictException);
    });
  });
});
