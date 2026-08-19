import { InjectRepository } from '@nestjs/typeorm';
import { RoomRepositoryPort } from '../ports/room-repository.port';
import { Room } from '../../entities/room.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TypeOrmRoomRepository implements RoomRepositoryPort {
  constructor(@InjectRepository(Room) private readonly repository: Repository<Room>) {}
  async findById(id: string): Promise<Room | null> {
    return this.repository.findOneBy({ id });
  }
  async findAll(): Promise<Room[]> {
    return this.repository.find({
      order: {
        roomNumber: 'ASC',
      },
    });
  }
  async save(room: Room): Promise<Room> {
    return this.repository.save(room);
  }
}
