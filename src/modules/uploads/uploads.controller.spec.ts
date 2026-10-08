import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller.js';
import { STORAGE_PROVIDER_TOKEN } from '../../common/providers/storage/storage.interface.js';

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: STORAGE_PROVIDER_TOKEN,
          useValue: { uploadFile: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
