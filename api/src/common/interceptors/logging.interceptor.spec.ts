import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function createMockContext(method = 'GET', url = '/api/test', statusCode = 200) {
  const getRequest = jest.fn().mockReturnValue({ method, url });
  const getResponse = jest.fn().mockReturnValue({ statusCode });
  const switchToHttp = jest.fn().mockReturnValue({ getRequest, getResponse });
  return { switchToHttp } as unknown as ExecutionContext;
}

function createMockHandler(value: unknown = { id: 1 }): CallHandler {
  return { handle: () => of(value) };
}

function createErrorHandler(error: unknown): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(interceptor['logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('logs successful request with method, url and status code', (done) => {
    const ctx = createMockContext('GET', '/api/employees', 200);
    const handler = createMockHandler([]);

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const logMsg = logSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain('GET');
        expect(logMsg).toContain('/api/employees');
        expect(logMsg).toContain('200');
        done();
      },
    });
  });

  it('logs successful POST request', (done) => {
    const ctx = createMockContext('POST', '/api/employees', 201);
    const handler = createMockHandler({ id: 42 });

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const logMsg = logSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain('POST');
        expect(logMsg).toContain('201');
        done();
      },
    });
  });

  it('includes correlation id in log', (done) => {
    const ctx = createMockContext();
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        const logMsg = logSpy.mock.calls[0][0] as string;
        // correlationId es un string alfanumérico entre corchetes
        expect(logMsg).toMatch(/\[[a-z0-9]+\]/);
        done();
      },
    });
  });

  it('logs warning on error with status code', (done) => {
    const ctx = createMockContext('DELETE', '/api/employees/99');
    const error = { status: 404, message: 'Not found' };
    const handler = createErrorHandler(error);

    interceptor.intercept(ctx, handler).subscribe({
      error: () => {
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const warnMsg = warnSpy.mock.calls[0][0] as string;
        expect(warnMsg).toContain('DELETE');
        expect(warnMsg).toContain('/api/employees/99');
        expect(warnMsg).toContain('404');
        done();
      },
    });
  });

  it('uses 500 as default status when error has no status', (done) => {
    const ctx = createMockContext('GET', '/api/test');
    const handler = createErrorHandler(new Error('unexpected'));

    interceptor.intercept(ctx, handler).subscribe({
      error: () => {
        const warnMsg = warnSpy.mock.calls[0][0] as string;
        expect(warnMsg).toContain('500');
        done();
      },
    });
  });

  it('includes +Xms duration in log', (done) => {
    const ctx = createMockContext();
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        const logMsg = logSpy.mock.calls[0][0] as string;
        expect(logMsg).toMatch(/\+\d+ms/);
        done();
      },
    });
  });
});
