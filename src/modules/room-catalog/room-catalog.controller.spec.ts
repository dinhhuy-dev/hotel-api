import { Test, TestingModule } from '@nestjs/testing';
import { RoomCatalogController } from './room-catalog.controller';
import { RoomCatalogService } from './room-catalog.service';

describe('RoomCatalogController', () => {
  let controller: RoomCatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomCatalogController],
      providers: [RoomCatalogService],
    }).compile();

    controller = module.get<RoomCatalogController>(RoomCatalogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
