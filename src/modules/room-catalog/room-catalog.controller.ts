import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoomCatalogService } from './room-catalog.service';
import { CreateRoomCatalogDto } from './dto/create-room-catalog.dto';
import { UpdateRoomCatalogDto } from './dto/update-room-catalog.dto';

@Controller('room-catalog')
export class RoomCatalogController {
  constructor(private readonly roomCatalogService: RoomCatalogService) {}

  @Post()
  create(@Body() createRoomCatalogDto: CreateRoomCatalogDto) {
    return this.roomCatalogService.create(createRoomCatalogDto);
  }

  @Get()
  findAll() {
    return this.roomCatalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomCatalogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomCatalogDto: UpdateRoomCatalogDto) {
    return this.roomCatalogService.update(+id, updateRoomCatalogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomCatalogService.remove(+id);
  }
}
