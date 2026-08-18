import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseMetaDto } from '../presentation/http/dto/response-meta.dto';

export interface ApiSuccessResponseOptions {
  readonly status?: number;
  readonly description?: string;
}

export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ApiSuccessResponseOptions = {},
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(model, ResponseMetaDto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description ?? 'Successful response.',
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            $ref: getSchemaPath(model),
          },
          meta: {
            $ref: getSchemaPath(ResponseMetaDto),
          },
        },
      },
    }),
  );
}

export function ApiSuccessVoidResponse(options: ApiSuccessResponseOptions = {}): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(ResponseMetaDto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description ?? 'Successful response.',
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            nullable: true,
            example: null,
            description: 'Always null for this endpoint.',
          },
          meta: {
            $ref: getSchemaPath(ResponseMetaDto),
          },
        },
      },
    }),
  );
}
