import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { map, Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';

interface PaginatedResult<T> {
  items: T[];
  meta: Record<string, unknown>;
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    'meta' in value &&
    typeof value.meta === 'object' &&
    value.meta !== null &&
    !Array.isArray(value.meta)
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown>> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((result: T) => {
        if (isPaginatedResult(result)) {
          return {
            status: true,
            statusCode: response.statusCode,
            meta: result.meta,
            message: 'Request successful',
            errors: null,
            data: result.items,
          };
        }

        return {
          status: true,
          statusCode: response.statusCode,
          meta: null,
          message: 'Request successful',
          errors: null,
          data: result,
        };
      }),
    );
  }
}
