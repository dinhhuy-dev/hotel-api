import { HttpStatus } from '@nestjs/common';
import { FacilityResponseDto } from '../../modules/room-catalog/dto/facility/facility-response.dto';
import { ApiPaginatedSuccessResponse } from './api-success-response.decorator';

const apiResponseMetadataKey = 'swagger/apiResponse';

class PaginatedFacilityController {
  @ApiPaginatedSuccessResponse(FacilityResponseDto, {
    description: 'Facilities retrieved successfully.',
  })
  list(): FacilityResponseDto[] {
    return [];
  }
}

describe('ApiPaginatedSuccessResponse', () => {
  it('documents an array data envelope with required pagination metadata', () => {
    const listHandler = Object.getOwnPropertyDescriptor(
      PaginatedFacilityController.prototype,
      'list',
    )?.value as (() => FacilityResponseDto[]) | undefined;

    if (listHandler === undefined) {
      throw new Error('Expected the paginated list handler to exist.');
    }

    expect(Reflect.getMetadata(apiResponseMetadataKey, listHandler)).toEqual({
      [HttpStatus.OK]: {
        description: 'Facilities retrieved successfully.',
        schema: {
          type: 'object',
          required: ['data', 'meta'],
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FacilityResponseDto',
              },
            },
            meta: {
              allOf: [
                {
                  $ref: '#/components/schemas/ResponseMetaDto',
                },
                {
                  type: 'object',
                  required: ['pagination'],
                  properties: {
                    pagination: {
                      $ref: '#/components/schemas/PaginationMetaDto',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
  });
});
