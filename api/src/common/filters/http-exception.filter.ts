import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Si ValidationPipe u otro código ya estructuró el error, pasarlo tal cual
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'success' in exceptionResponse
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>).message ??
            exception.message);

      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} → ${status}: ${String(message)}`,
        );
      }

      response.status(status).json({
        success: false,
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Error inesperado (no-HTTP): loguear y responder genérico sin exponer detalles
    this.logger.error(
      `[${request.method}] ${request.url} → Error inesperado: ${(exception as Error)?.message ?? String(exception)}`,
      (exception as Error)?.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
