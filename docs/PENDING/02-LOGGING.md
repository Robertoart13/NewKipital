# 📝 LOGGING - Issues Pendientes

**Prioridad Global:** P0 (CRÍTICO)
**Esfuerzo Total:** 1 semana
**Asignado a:** [Sin asignar]

---

## ISSUE-013: Implementar Winston logger centralizado

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [logging] [infrastructure]

### 📝 Descripción
Actualmente Logger de NestJS se importa pero casi no se usa. Necesitamos Winston para logs estructurados.

### 🎯 Objetivo
Winston configurado con niveles, formatos JSON, y rotación de archivos.

### 📁 Archivos Afectados
- `api/src/common/logger/logger.module.ts` (crear)
- `api/src/common/logger/logger.config.ts` (crear)
- `api/src/app.module.ts` (modificar)
- `api/package.json` (añadir winston)

### ✅ Criterios de Aceptación
- [ ] Winston instalado: `npm install winston nest-winston`
- [ ] LoggerModule configurado como global
- [ ] Niveles: DEBUG, INFO, WARN, ERROR
- [ ] Formato JSON para archivos
- [ ] Formato colorizado para consola
- [ ] Rotación diaria de archivos (logs/error.log, logs/combined.log)
- [ ] Logs antiguos se comprimen automáticamente

### 🔧 Implementación Sugerida

```typescript
// src/common/logger/logger.module.ts
import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`;
  }),
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
        }),
        new winston.transports.DailyRotateFile({
          dirname: 'logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
        new winston.transports.DailyRotateFile({
          dirname: 'logs',
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true,
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
```

### 🧪 Cómo Verificar
```bash
npm run start:dev
# Verificar que logs aparecen en consola coloreados
ls logs/
# Debe mostrar: combined-2026-02-24.log, error-2026-02-24.log
```

---

## ISSUE-014: Agregar logging a AuthService

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [logging] [auth]

### 📝 Descripción
AuthService actualmente solo tiene 1 log. Necesita logging completo para auditar intentos de login.

### 📁 Archivos Afectados
- `api/src/modules/auth/auth.service.ts`

### ✅ Criterios de Aceptación
- [ ] Login exitoso: log INFO con userId, email, IP
- [ ] Login fallido: log WARN con email, razón, IP
- [ ] Cuenta bloqueada: log ERROR con userId, intentos
- [ ] Refresh token exitoso: log DEBUG con userId
- [ ] Refresh token fallido: log WARN con razón
- [ ] Microsoft login: log INFO con microsoftOid
- [ ] Cada log incluye correlationId (ISSUE-016)

### 🔧 Implementación Sugerida

```typescript
// auth.service.ts
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    // ...otros
  ) {}

  async login(email: string, password: string, ip?: string): Promise<IssuedSession> {
    this.logger.info('Intento de login', { email, ip });

    try {
      const user = await this.usersService.validateForLogin(email);

      if (!user.passwordHash) {
        this.logger.warn('Login fallido: usuario sin password', { email, ip });
        throw new UnauthorizedException('Credenciales invalidas');
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        this.logger.warn('Login fallido: password incorrecto', {
          email,
          ip,
          userId: user.id
        });
        await this.usersService.registerFailedAttempt(user.id);
        throw new UnauthorizedException('Credenciales invalidas');
      }

      this.logger.info('Login exitoso', {
        userId: user.id,
        email: user.email,
        ip
      });

      return this.issueSessionTokens(user, ip);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      this.logger.error('Error inesperado en login', {
        email,
        ip,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

---

## ISSUE-015: Agregar logging a servicios críticos

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [logging] [backend]

### 📝 Descripción
Resto de servicios (Companies, Employees, Payroll, PersonalActions) necesitan logging.

### 📁 Archivos Afectados
- `api/src/modules/companies/companies.service.ts`
- `api/src/modules/employees/employees.service.ts`
- `api/src/modules/payroll/payroll.service.ts`
- `api/src/modules/personal-actions/personal-actions.service.ts`

### ✅ Criterios de Aceptación

**CompaniesService:**
- [ ] create(): log INFO con companyId, nombre, userId
- [ ] update(): log INFO con cambios realizados
- [ ] inactivate(): log WARN con razón
- [ ] commitTempLogo(): log INFO con logoPath

**EmployeesService:**
- [ ] create(): log INFO con employeeId, nombre
- [ ] update(): log INFO con cambios
- [ ] inactivate(): log WARN con razón

**PayrollService:**
- [ ] create(): log INFO con payrollId, periodo
- [ ] verify(): log INFO con payrollId, userId
- [ ] apply(): log WARN con payrollId (crítico)
- [ ] reopen(): log ERROR con payrollId, motivo

**PersonalActionsService:**
- [ ] create(): log INFO con actionId, tipo
- [ ] approve(): log INFO con actionId, userId
- [ ] reject(): log WARN con actionId, motivo

---

## ISSUE-016: Implementar Correlation IDs

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [logging] [infrastructure]

### 📝 Descripción
Sin correlation IDs es imposible trazar requests a través de múltiples servicios/funciones.

### 🎯 Objetivo
Todo request tiene un ID único que se propaga a todos los logs.

### 📁 Archivos Afectados
- `api/src/common/middleware/correlation-id.middleware.ts` (crear)
- `api/src/app.module.ts`
- `api/src/common/decorators/correlation-id.decorator.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Middleware genera UUID si no viene en header
- [ ] Header `x-correlation-id` se respeta si viene del cliente
- [ ] Response incluye header `x-correlation-id`
- [ ] Todos los logs incluyen correlationId
- [ ] Decorador `@CorrelationId()` para inyectar en controllers

### 🔧 Implementación Sugerida

```typescript
// correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
  }
}

// En servicios:
this.logger.info('Login exitoso', {
  userId: user.id,
  correlationId: req['correlationId'],
});
```

---

## ISSUE-017: HTTP Request logging middleware

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [logging] [middleware]

### 📝 Descripción
Loguear todos los HTTP requests automáticamente (método, ruta, status, duración).

### ✅ Criterios de Aceptación
- [ ] Log en cada request: método, ruta, IP, userId (si auth)
- [ ] Log en response: status code, duración (ms)
- [ ] Excluir rutas de health checks (/health, /metrics)
- [ ] Formato: `GET /api/employees 200 45ms userId=5 ip=192.168.1.1`

### 🔧 Implementación Sugerida

```typescript
// http-logger.middleware.ts
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const correlationId = req['correlationId'];
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const userId = req['user']?.id || null;

      const logData = {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userId,
        correlationId,
        userAgent,
      };

      if (statusCode >= 500) {
        this.logger.error('HTTP Request', logData);
      } else if (statusCode >= 400) {
        this.logger.warn('HTTP Request', logData);
      } else {
        this.logger.info('HTTP Request', logData);
      }
    });

    next();
  }
}
```

---

## ISSUE-018: Error logging interceptor

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [logging] [errors]

### 📝 Descripción
Capturar y loguear todas las excepciones con stack traces completos.

### ✅ Criterios de Aceptación
- [ ] Interceptor global que captura todas las excepciones
- [ ] Log ERROR con stack trace completo
- [ ] Incluye contexto (controller, método, userId)
- [ ] Sanitiza datos sensibles (passwords, tokens)

### 🔧 Implementación Sugerida

```typescript
// error-logger.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    const userId = req.user?.id || null;
    const correlationId = req['correlationId'];

    return next.handle().pipe(
      catchError((error) => {
        const sanitizedBody = this.sanitize(body);

        this.logger.error('Exception caught', {
          message: error.message,
          stack: error.stack,
          method,
          url,
          userId,
          correlationId,
          body: sanitizedBody,
          statusCode: error.status || 500,
        });

        return throwError(() => error);
      }),
    );
  }

  private sanitize(obj: any): any {
    // Remover passwords, tokens, etc.
    const sensitive = ['password', 'token', 'secret', 'passwordHash'];
    // ...lógica de sanitización
    return obj;
  }
}
```

---

## 📊 Progreso Logging

- [ ] ISSUE-013: Winston logger centralizado
- [ ] ISSUE-014: Logging en AuthService
- [ ] ISSUE-015: Logging en servicios críticos
- [ ] ISSUE-016: Correlation IDs
- [ ] ISSUE-017: HTTP Request logging
- [ ] ISSUE-018: Error logging interceptor

**Total:** 0/6 completados (0%)
