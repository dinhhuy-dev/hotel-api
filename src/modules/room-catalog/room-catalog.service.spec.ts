import { Test, TestingModule } from '@nestjs/testing';
import { RoomCatalogService } from './room-catalog.service';

describe('RoomCatalogService', () => {
  let service: RoomCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomCatalogService],
    }).compile();

    service = module.get<RoomCatalogService>(RoomCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
