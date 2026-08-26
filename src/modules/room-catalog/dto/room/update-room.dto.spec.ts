import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRoomDto } from './update-room.dto';

describe('UpdateRoomDto', () => {
  it('allows omitted fields and normalizes provided text fields', async () => {
    const dto = plainToInstance(UpdateRoomDto, {
      roomNumber: ' a-102 ',
      floor: ' b ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      roomNumber: 'A-102',
      floor: 'B',
    });
  });

  it('rejects null for every non-nullable update field', async () => {
    const dto = plainToInstance(UpdateRoomDto, {
      roomNumber: null,
      floor: null,
      roomTypeId: null,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['roomNumber', 'floor', 'roomTypeId']),
    );
  });
});
