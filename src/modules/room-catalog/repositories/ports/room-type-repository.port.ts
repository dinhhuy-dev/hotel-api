import { RoomType } from '../../entities/room-type.entity';

export interface RoomTypeRepositoryPort {
  findById(id: string): Promise<RoomType | null>;
  findAll(): Promise<RoomType[]>;
  save(roomType: RoomType): Promise<RoomType>;
}
