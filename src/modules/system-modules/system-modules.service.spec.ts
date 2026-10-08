import { Test, TestingModule } from '@nestjs/testing';
import { SystemModulesService } from './system-modules.service.js';

describe('SystemModulesService', () => {
  let service: SystemModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemModulesService],
    }).compile();

    service = module.get<SystemModulesService>(SystemModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
