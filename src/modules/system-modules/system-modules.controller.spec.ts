import { Test, TestingModule } from '@nestjs/testing';
import { SystemModulesController } from './system-modules.controller.js';
import { SystemModulesService } from './system-modules.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SystemModulesController', () => {
  let controller: SystemModulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemModulesController],
      providers: [
        {
          provide: SystemModulesService,
          useValue: {
            findAll: vi.fn(),
            findOne: vi.fn(),
            updateStatus: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SystemModulesController>(SystemModulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
