import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface ResponseMeta {
  readonly requestId: string;
  readonly timestamp: string;
  readonly pagination?: PaginationMeta;
}

export interface SuccessResponse<T> {
  readonly data: T | null;
  readonly meta: ResponseMeta;
}

export class PaginatedResult<T> {
  constructor(
    public readonly items: readonly T[],
    public readonly pagination: PaginationMeta,
  ) {}
}

type RequestWithId = Request & {
  readonly id: string | number;
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  SuccessResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<SuccessResponse<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return next.handle().pipe(
      map((result: unknown): SuccessResponse<unknown> => {
        const meta: ResponseMeta = {
          requestId: String(request.id),
          timestamp: new Date().toISOString(),
        };

        if (result instanceof PaginatedResult) {
          return {
            data: result.items,
            meta: {
              ...meta,
              pagination: result.pagination,
            },
          };
        }

        return {
          data: result === undefined ? null : result,
          meta,
        };
      }),
    );
  }
}
