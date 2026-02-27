import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();
    const correlationId = Math.random().toString(36).substring(2, 10);

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          const ms = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${res.statusCode} +${ms}ms [${correlationId}]`,
          );
        },
        error: (err: { status?: number }) => {
          const ms = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.warn(
            `${method} ${url} ${status} +${ms}ms [${correlationId}]`,
          );
        },
      }),
    );
  }
}
