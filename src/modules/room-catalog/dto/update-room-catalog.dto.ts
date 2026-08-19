import { PartialType } from '@nestjs/swagger';
import { CreateRoomCatalogDto } from './create-room-catalog.dto';

export class UpdateRoomCatalogDto extends PartialType(CreateRoomCatalogDto) {}
