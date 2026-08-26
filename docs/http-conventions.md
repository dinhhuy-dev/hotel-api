# HTTP Conventions

## Status

This document records HTTP behavior verified in the source code on 2026-08-18. It separates current runtime behavior from planned improvements so feature modules can reuse the same conventions without copying assumptions.

The source code remains authoritative when this document and the implementation differ.

## Routing

The application sets the global prefix to `api` in [`main.ts`](../src/main.ts). Controllers include the API version and resource name in their controller prefix.

Use this pattern:

```ts
@Controller('v1/<resource>')
```

The effective URL is:

```text
/api/v1/<resource>
```

The existing authentication controller uses `@Controller('v1/auth')`, which produces routes such as `/api/v1/auth/sign-up`. Method-level action names use lowercase kebab-case.

The application does not use NestJS URI versioning. The `v1` segment is part of each controller path. Swagger UI is available at `/docs`.

### Routing Checklist

- Include `v1` in the controller prefix.
- Use lowercase kebab-case for multiword path segments.
- Group related routes under one business resource prefix.
- Do not repeat the global `api` prefix in a controller.
- Document the complete effective URL in feature plans and API examples.

## Successful Responses

[`ResponseInterceptor`](../src/common/interceptors/response.interceptor.ts) wraps every successful controller result in this envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id",
    "timestamp": "2026-08-18T00:00:00.000Z"
  }
}
```

The interceptor applies these rules:

| Controller result                         | Runtime `data`     |
| ----------------------------------------- | ------------------ |
| Object, array, string, number, or boolean | The returned value |
| `undefined`                               | `null`             |
| `PaginatedResult<T>`                      | The `items` array  |

Controllers return response DTOs or `PaginatedResult<T>`. They do not build the `{ data, meta }` envelope themselves and do not return TypeORM entities directly.

## Pagination

The runtime pagination metadata contains exactly:

```ts
interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
```

A paginated controller must return an instance of the exported `PaginatedResult<T>` class:

```ts
return new PaginatedResult(items, {
  page,
  pageSize,
  totalItems,
  totalPages,
});
```

The interceptor checks `result instanceof PaginatedResult`. Returning a plain object with `items` and `pagination` does not activate pagination handling. The plain object would appear unchanged under `data`.

The runtime response is:

```json
{
  "data": [],
  "meta": {
    "requestId": "request-id",
    "timestamp": "2026-08-18T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
}
```

Feature query DTOs may expose `limit` to HTTP clients, but they must map it to `pageSize` when constructing pagination metadata. Each feature defines its default and maximum page size in its approved plan.

### Pagination Checklist

- Validate and transform pagination query parameters.
- Reject values outside the feature's approved bounds.
- Apply deterministic sorting before offset and limit.
- Calculate `totalPages` from `totalItems` and `pageSize`.
- Return `new PaginatedResult(...)`, not a structurally similar object.
- Test the runtime envelope and pagination metadata.

## Swagger Success Responses

[`api-success-response.decorator.ts`](../src/common/decorators/api-success-response.decorator.ts) provides two shared decorators:

| Decorator                   | Use                                                   |
| --------------------------- | ----------------------------------------------------- |
| `ApiSuccessResponse(Model)` | A successful response whose `data` contains one model |
| `ApiSuccessVoidResponse()`  | A successful response whose `data` is `null`          |

These decorators describe the Swagger schema only. `ResponseInterceptor` creates the runtime envelope.

`ResponseMetaDto` already documents optional pagination metadata. However, `ApiSuccessResponse(Model)` describes `data` as one object reference. It does not describe an array and must not document list or paginated endpoints.

The project still needs a shared decorator with this contract:

```ts
ApiPaginatedSuccessResponse(ItemDto);
```

That decorator must describe:

- `data` as an array of `ItemDto`.
- `meta` as `ResponseMetaDto` with pagination.
- The route's actual success status and description.

Do not claim that a list endpoint has correct Swagger documentation until this decorator or an equivalent array schema exists and has been tested.

## Error Responses

[`HttpExceptionFilter`](../src/common/filters/http-exception.filter.ts) is registered globally with `@Catch()`. It handles NestJS `HttpException` instances and unknown exceptions.

The current error response is not wrapped in `{ data, meta }`. It uses this shape:

```json
{
  "statusCode": 409,
  "message": ["Room number already exists."],
  "error": "DUPLICATE_ROOM_NUMBER",
  "timestamp": "2026-08-18T00:00:00.000Z",
  "path": "/api/v1/room-catalog/management/rooms"
}
```

The filter always converts `message` to an array. Standard business module services may throw NestJS HTTP exception subclasses with a safe object payload:

```ts
throw new ConflictException({
  message: 'Room number already exists.',
  error: 'DUPLICATE_ROOM_NUMBER',
});
```

Use `error` as the stable machine-readable code. Keep `message` safe for clients. Never expose SQL details, provider responses, stack traces, tokens, credentials, or internal class names.

Avoid constructing `HttpException` with a raw string. For a string response, the current filter copies the same string into both `message` and `error`.

### Known Error-Handling Gaps

The current filter exposes `exception.message` and `exception.name` for an unknown JavaScript `Error`. This behavior conflicts with the architecture requirement for a generic internal error. Treat it as a known defect, not a reusable convention.

The current error response also omits the request ID. Error responses and success responses therefore use different metadata contracts.

Before production use, the global filter should:

- Return a generic message and stable code for unknown errors.
- Log internal details privately instead of returning them.
- Include the request ID if the project adopts request correlation for errors.
- Preserve safe validation messages for known `HttpException` responses.
- Add focused tests for known and unknown exception paths.

## Feature Implementation Checklist

When a feature adds HTTP routes:

1. Follow `/api/v1/<resource>` routing conventions.
2. Return response DTOs, `undefined`, or `PaginatedResult<T>` from controllers.
3. Let `ResponseInterceptor` build successful envelopes.
4. Use the correct Swagger decorator for object, void, or paginated responses.
5. Throw safe, stable HTTP exception payloads from standard module services.
6. Document authentication and expected error responses.
7. Verify runtime responses with focused controller or E2E tests.
