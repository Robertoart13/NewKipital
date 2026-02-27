import { ArgumentsHost, ForbiddenException, HttpException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

function createMockHost(method = 'GET', url = '/api/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const getResponse = jest.fn().mockReturnValue({ status });
  const getRequest = jest.fn().mockReturnValue({ method, url });
  const switchToHttp = jest.fn().mockReturnValue({ getResponse, getRequest });
  return { switchToHttp } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(filter['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('normalizes HttpException with string message', () => {
    const host = createMockHost();
    const exception = new HttpException('Recurso no encontrado', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(404);
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json as jest.Mock;
    expect(jsonCall).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Recurso no encontrado',
      }),
    );
  });

  it('passes through structured response from ValidationPipe', () => {
    const host = createMockHost('POST', '/api/employees');
    const structured = { success: false, data: null, message: ['campo requerido'], error: 'Solicitud invalida' };
    const exception = new HttpException(structured, HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json as jest.Mock;
    expect(jsonCall).toHaveBeenCalledWith(structured);
  });

  it('returns 403 for ForbiddenException', () => {
    const host = createMockHost();
    const exception = new ForbiddenException('Acceso denegado');

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 for UnauthorizedException', () => {
    const host = createMockHost();
    const exception = new UnauthorizedException('No autorizado');

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 404 for NotFoundException', () => {
    const host = createMockHost();
    const exception = new NotFoundException('No encontrado');

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns generic 500 for unknown errors without exposing details', () => {
    const host = createMockHost();
    const exception = new Error('DB connection failed - internal details');

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json as jest.Mock;
    const body = jsonCall.mock.calls[0][0] as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Error interno del servidor');
    // No debe exponer detalles del error interno
    expect(body.message).not.toContain('DB connection');
  });

  it('response includes timestamp and path', () => {
    const host = createMockHost('DELETE', '/api/employees/99');
    const exception = new NotFoundException();

    filter.catch(exception, host);

    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json as jest.Mock;
    const body = jsonCall.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toHaveProperty('timestamp');
    expect(body.path).toBe('/api/employees/99');
  });
});
