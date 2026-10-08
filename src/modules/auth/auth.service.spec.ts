import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: vi.fn(),
            findByCpf: vi.fn(),
            findById: vi.fn(),
            checkLockout: vi.fn(),
            resetLoginAttempts: vi.fn(),
            handleFailedLoginAttempt: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn().mockReturnValue('token'),
            verify: vi.fn().mockReturnValue({ sub: '1' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      vi.spyOn(usersService, 'findByCpf').mockResolvedValue(null);
      await expect(service.login({ cpf: '00000000000', password: '123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      vi.spyOn(usersService, 'findByCpf').mockResolvedValue({ isActive: true, passwordHash: 'hash', failedLoginAttempts: 0 } as any);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(service.login({ cpf: '00000000000', password: '123' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
