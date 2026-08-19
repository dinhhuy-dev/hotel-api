import { Injectable } from '@nestjs/common';
import { CreateRoomCatalogDto } from './dto/create-room-catalog.dto';
import { UpdateRoomCatalogDto } from './dto/update-room-catalog.dto';

@Injectable()
export class RoomCatalogService {
  create(createRoomCatalogDto: CreateRoomCatalogDto) {
    console.log(createRoomCatalogDto);
    return 'This action adds a new roomCatalog';
  }

  findAll() {
    return `This action returns all roomCatalog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} roomCatalog`;
  }

  update(id: number, updateRoomCatalogDto: UpdateRoomCatalogDto) {
    console.log(updateRoomCatalogDto);
    return `This action updates a #${id} roomCatalog`;
  }

  remove(id: number) {
    return `This action removes a #${id} roomCatalog`;
  }
}
