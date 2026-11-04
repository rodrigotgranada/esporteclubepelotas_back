import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SystemModulesService } from './system-modules.service.js';
import { SystemModule } from './schemas/system-module.schema.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SystemModulesService', () => {
  let service: SystemModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemModulesService,
        {
          provide: getModelToken(SystemModule.name),
          useValue: {
            find: vi.fn(),
            findById: vi.fn(),
            findOne: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemModulesService>(SystemModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
