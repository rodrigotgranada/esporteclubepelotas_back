import { Test, TestingModule } from '@nestjs/testing';
import { SystemModulesController } from './system-modules.controller.js';

describe('SystemModulesController', () => {
  let controller: SystemModulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemModulesController],
    }).compile();

    controller = module.get<SystemModulesController>(SystemModulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
