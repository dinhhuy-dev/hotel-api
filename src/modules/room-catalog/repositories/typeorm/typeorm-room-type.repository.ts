import { InjectRepository } from '@nestjs/typeorm';
import { RoomType } from '../../entities/room-type.entity';
import { RoomTypeRepositoryPort } from '../ports/room-type-repository.port';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TypeOrmRoomTypeRepository implements RoomTypeRepositoryPort {
  constructor(@InjectRepository(RoomType) private readonly repository: Repository<RoomType>) {}

  async findById(id: string): Promise<RoomType | null> {
    return this.repository.findOneBy({ id });
  }
  async findAll(): Promise<RoomType[]> {
    return this.repository.find({
      order: {
        displayOrder: 'ASC',
        code: 'ASC',
        id: 'ASC',
      },
    });
  }
  async save(roomType: RoomType): Promise<RoomType> {
    return this.repository.save(roomType);
  }
}
