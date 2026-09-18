import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';
import { ConflictException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserModel = {
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ email: 'test@test.com' }),
      });

      await expect(
        service.create({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          cpf: '123',
          birthDate: new Date().toISOString(),
          password: 'pass',
          phones: [],
          addresses: [],
        })
      ).rejects.toThrow(ConflictException);
    });
  });
});
