import { Test, TestingModule } from '@nestjs/testing';
import { OwnerPanelController } from './owner-panel.controller';

describe('OwnerPanelController', () => {
  let controller: OwnerPanelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnerPanelController],
    }).compile();

    controller = module.get<OwnerPanelController>(OwnerPanelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
