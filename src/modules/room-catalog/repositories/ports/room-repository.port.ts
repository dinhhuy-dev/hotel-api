import { Room } from '../../entities/room.entity';

export interface RoomRepositoryPort {
  findById(id: string): Promise<Room | null>;
  findAll(): Promise<Room[]>;
  save(room: Room): Promise<Room>;
}
