import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const normalized = typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

      response.status(status).json({
        success: false,
        data: null,
        message: normalized.message ?? 'No se pudo completar la solicitud.',
        error: normalized.error ?? exception.name,
      });
      return;
    }

    if (this.isTransientDatabaseConnectionError(exception)) {
      this.logger.error('Fallo temporal de conexion con base de datos', exception as Error);
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        data: null,
        message: 'No se pudo completar la accion por una desconexion temporal. Intente nuevamente en unos segundos.',
        error: 'Servicio temporalmente no disponible',
      });
      return;
    }

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & {
        driverError?: { code?: string; sqlMessage?: string };
      }).driverError;

      if (driverError?.code === 'ER_DUP_ENTRY') {
        response.status(HttpStatus.CONFLICT).json({
          success: false,
          data: null,
          message: 'El registro ya existe y no se puede duplicar.',
          error: 'Conflicto de datos',
        });
        return;
      }
    }

    this.logger.error('Error no controlado', exception as Error);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      message: 'Ocurrio un error inesperado al procesar la solicitud.',
      error: 'Internal server error',
    });
  }

  private isTransientDatabaseConnectionError(error: unknown): boolean {
    const transientCodes = new Set([
      'ECONNRESET',
      'PROTOCOL_CONNECTION_LOST',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EPIPE',
    ]);

    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError & { driverError?: { code?: string; fatal?: boolean } }).driverError;
      if (driverError?.code && transientCodes.has(driverError.code)) {
        return true;
      }
      if (driverError?.fatal === true) {
        return true;
      }
    }

    if (error instanceof Error) {
      return /ECONNRESET|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|ECONNREFUSED|EPIPE/.test(error.message);
    }

    return false;
  }
}

