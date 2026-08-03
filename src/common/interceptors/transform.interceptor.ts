import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  status: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'status' in data &&
          'data' in data
        ) {
          return data as unknown as ResponseEnvelope<T>;
        }

        let message: string | undefined;
        let responseData = data;

        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          'data' in data
        ) {
          const obj = data as Record<string, any>;
          message = obj.message;
          responseData = obj.data;
        }

        const result: Record<string, any> = {
          status: 'success',
        };

        if (message) {
          result.message = message;
        }

        result.data = responseData ?? null;

        return result as ResponseEnvelope<T>;
      }),
    );
  }
}
