import { Test, TestingModule } from '@nestjs/testing';
import { OwnerPanelService } from './owner-panel.service';

describe('OwnerPanelService', () => {
  let service: OwnerPanelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OwnerPanelService],
    }).compile();

    service = module.get<OwnerPanelService>(OwnerPanelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
