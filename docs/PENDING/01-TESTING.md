# 🧪 TESTING - Issues Pendientes

**Prioridad Global:** P0 (CRÍTICO)
**Esfuerzo Total:** 2-3 semanas
**Asignado a:** [Persona de testing confirmada]

---

## ISSUE-001: Configurar infraestructura de testing

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [testing] [infrastructure]

### 📝 Descripción
Aunque package.json tiene scripts de testing, falta configuración completa de Jest y setup de base de datos de prueba.

### 🎯 Objetivo
- Jest configurado correctamente con TypeORM
- Base de datos in-memory o contenedor Docker para tests
- Coverage reports funcionando

### 📁 Archivos Afectados
- `api/jest.config.js` (crear)
- `api/test/setup.ts` (crear)
- `api/test/teardown.ts` (crear)
- `api/.env.test` (crear)

### ✅ Criterios de Aceptación
- [ ] `npm run test` ejecuta sin errores
- [ ] `npm run test:cov` genera reporte de coverage
- [ ] BD de test se crea/destruye automáticamente
- [ ] Setup carga fixtures básicos (admin user, etc.)

### 🔧 Implementación Sugerida

```typescript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.entity.ts',
    '!**/*.dto.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
};

// test/setup.ts
import { DataSource } from 'typeorm';

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3307, // diferente del prod
    username: 'test',
    password: 'test',
    database: 'kpital_test',
    entities: ['src/**/*.entity.ts'],
    synchronize: true,
  });
  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});
```

### 🧪 Cómo Verificar
```bash
npm run test
# Debe mostrar: "No tests found" (porque aún no hay .spec.ts)
npm run test:cov
# Debe generar carpeta coverage/
```

---

## ISSUE-002: Tests unitarios - AuthService

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [testing] [auth] [unit]

### 📝 Descripción
AuthService es crítico (login, JWT, refresh tokens) pero sin tests. Riesgo alto de regresiones.

### 🎯 Objetivo
Cobertura 80%+ de AuthService con tests unitarios.

### 📁 Archivos Afectados
- `api/src/modules/auth/auth.service.spec.ts` (crear)
- `api/src/modules/auth/auth.service.ts`

### ✅ Criterios de Aceptación
- [ ] Test: Login con credenciales válidas retorna tokens
- [ ] Test: Login con credenciales inválidas lanza UnauthorizedException
- [ ] Test: 5 intentos fallidos bloquean cuenta
- [ ] Test: Refresh token rotation funciona correctamente
- [ ] Test: Refresh token viejo queda revocado después de rotar
- [ ] Test: Refresh token con JTI inválido falla
- [ ] Test: buildSession retorna permisos correctos
- [ ] Test: resolvePermissions con DENY override funciona
- [ ] Test: Microsoft login bindea identidad si no existe
- [ ] Coverage: 80%+

### 🔧 Implementación Sugerida

```typescript
// auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            validateForLogin: jest.fn(),
            registerFailedAttempt: jest.fn(),
            registerSuccessfulLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-token'),
            verify: jest.fn(),
          },
        },
        // ...otros repositorios mockeados
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('login', () => {
    it('debe retornar tokens cuando credenciales son válidas', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        nombre: 'Test',
        apellido: 'User',
      };

      jest.spyOn(usersService, 'validateForLogin').mockResolvedValue(mockUser as any);

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
      expect(result).toHaveProperty('session');
    });

    it('debe lanzar UnauthorizedException cuando password es incorrecto', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correct-password', 12),
      };

      jest.spyOn(usersService, 'validateForLogin').mockResolvedValue(mockUser as any);

      await expect(
        service.login('test@example.com', 'wrong-password')
      ).rejects.toThrow(UnauthorizedException);
    });

    // ...más tests
  });
});
```

### 🧪 Cómo Verificar
```bash
npm run test -- auth.service.spec.ts
npm run test:cov -- auth.service.spec.ts
# Debe mostrar cobertura 80%+
```

---

## ISSUE-003: Tests unitarios - CompaniesService

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [testing] [companies] [unit]

### 📝 Descripción
CompaniesService tiene lógica de negocio crítica (soft delete, audit trail, logo management).

### 🎯 Objetivo
Cobertura 70%+ con tests unitarios.

### 📁 Archivos Afectados
- `api/src/modules/companies/companies.service.spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Test: create() con cédula duplicada lanza ConflictException
- [ ] Test: create() asigna automáticamente a usuarios MASTER
- [ ] Test: update() valida prefijo único
- [ ] Test: inactivate() cambia estado a 0
- [ ] Test: inactivate() registra fechaInactivacion
- [ ] Test: inactivate() publica evento de auditoría
- [ ] Test: commitTempLogo() mueve archivo de temp/ a uploads/
- [ ] Test: commitTempLogo() elimina logos antiguos
- [ ] Test: getAuditTrail() retorna cambios ordenados por fecha
- [ ] Coverage: 70%+

---

## ISSUE-004: Tests unitarios - EmployeesService

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [testing] [employees] [unit]

### 📝 Descripción
EmployeesService es core del sistema (33 columnas, workflow creation).

### 🎯 Objetivo
Cobertura 70%+ con tests unitarios.

### 📁 Archivos Afectados
- `api/src/modules/employees/employees.service.spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Test: create() valida campos requeridos
- [ ] Test: create() valida email único
- [ ] Test: create() valida cédula única por empresa
- [ ] Test: update() permite modificar datos básicos
- [ ] Test: inactivate() hace soft delete
- [ ] Test: findAll() filtra por empresa del usuario
- [ ] Test: findAll() no retorna inactivos por defecto
- [ ] Coverage: 70%+

---

## ISSUE-005: Tests unitarios - PayrollService

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [testing] [payroll] [unit]

### 📝 Descripción
PayrollService maneja estados críticos (Abierta → Verificada → Aplicada).

### 🎯 Objetivo
Cobertura 70%+ enfocado en transiciones de estado.

### 📁 Archivos Afectados
- `api/src/modules/payroll/payroll.service.spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Test: create() valida planilla duplicada
- [ ] Test: verify() solo permite desde estado Abierta/EnProceso
- [ ] Test: apply() solo permite desde estado Verificada
- [ ] Test: apply() usa optimistic locking (versionLock)
- [ ] Test: apply() lanza ConflictException si version cambió
- [ ] Test: reopen() solo desde Verificada
- [ ] Test: inactivate() no permite si está Aplicada
- [ ] Test: eventos de dominio se emiten correctamente
- [ ] Coverage: 70%+

---

## ISSUE-006: Tests unitarios - PermissionsGuard

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [testing] [security] [unit]

### 📝 Descripción
PermissionsGuard es critical path de seguridad, debe estar 100% testeado.

### 🎯 Objetivo
Cobertura 100% de PermissionsGuard.

### 📁 Archivos Afectados
- `api/src/common/guards/permissions.guard.spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Test: permite acceso con permiso válido
- [ ] Test: bloquea acceso sin permiso
- [ ] Test: DENY override bloquea aunque rol tenga permiso
- [ ] Test: ALLOW override permite aunque rol no tenga
- [ ] Test: companyId en contexto se usa correctamente
- [ ] Test: appCode en contexto se usa correctamente
- [ ] Coverage: 100%

---

## ISSUE-007: Tests de integración - EmployeeCreationWorkflow

**Prioridad:** P0
**Esfuerzo:** M (2 días)
**Etiquetas:** [testing] [integration] [workflow]

### 📝 Descripción
Workflow crítico que debe ser transaccional (ACID). Necesita tests de rollback.

### 🎯 Objetivo
Validar que rollback funciona si falla cualquier paso.

### 📁 Archivos Afectados
- `api/src/workflows/employees/employee-creation.workflow.spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Test: crea usuario + empleado + asignaciones en una transacción
- [ ] Test: rollback si falla creación de usuario
- [ ] Test: rollback si falla creación de empleado
- [ ] Test: rollback si falla asignación de empresa
- [ ] Test: rollback si email ya existe
- [ ] Test: emite evento EmployeeCreated al finalizar
- [ ] Test: NO emite evento si falla

---

## ISSUE-008: Tests E2E - Auth flow completo

**Prioridad:** P1
**Esfuerzo:** M (2 días)
**Etiquetas:** [testing] [e2e] [auth]

### 📝 Descripción
Test end-to-end del flujo completo: login → refresh → logout.

### 🎯 Objetivo
Validar cookies httpOnly, CSRF tokens, y refresh rotation.

### 📁 Archivos Afectados
- `api/test/auth.e2e-spec.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] POST /api/auth/login retorna 200 con cookies httpOnly
- [ ] Cookie accessToken tiene SameSite correcto
- [ ] POST /api/auth/refresh rota tokens correctamente
- [ ] POST /api/auth/logout revoca refresh token
- [ ] GET /api/auth/me con token válido retorna usuario
- [ ] GET /api/auth/me con token inválido retorna 401

### 🔧 Implementación Sugerida

```typescript
// test/auth.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup app
  });

  it('POST /api/auth/login should return tokens and cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@kpital.com', password: 'Test123!' })
      .expect(200);

    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('httpOnly');
    expect(response.body).toHaveProperty('session');
    expect(response.body.session.user.email).toBe('admin@kpital.com');
  });
});
```

---

## ISSUE-009: Tests E2E - Companies CRUD

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [testing] [e2e] [companies]

### ✅ Criterios de Aceptación
- [ ] POST /api/companies crea empresa
- [ ] GET /api/companies retorna solo empresas del usuario
- [ ] PUT /api/companies/:id actualiza
- [ ] DELETE /api/companies/:id hace soft delete
- [ ] POST /api/companies/:id/reactivate reactiva empresa

---

## ISSUE-010: Tests E2E - Permissions enforcement

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [testing] [e2e] [security]

### ✅ Criterios de Aceptación
- [ ] Usuario sin permiso employee:view → 403 en GET /api/employees
- [ ] Usuario con permiso employee:view → 200
- [ ] DENY override bloquea acceso
- [ ] Cambio de empresa actualiza permisos

---

## ISSUE-011: Setup de coverage reporting

**Prioridad:** P1
**Esfuerzo:** XS (medio día)
**Etiquetas:** [testing] [infrastructure]

### 📝 Descripción
Integrar coverage con CI/CD y generar reportes visuales.

### ✅ Criterios de Aceptación
- [ ] npm run test:cov genera reporte HTML
- [ ] Coverage sube a Codecov o SonarQube
- [ ] Badge de coverage en README.md
- [ ] CI falla si coverage < 60%

---

## ISSUE-012: Fixtures y factories para testing

**Prioridad:** P1
**Esfuerzo:** M (2 días)
**Etiquetas:** [testing] [infrastructure]

### 📝 Descripción
Crear factories para generar datos de prueba fácilmente.

### ✅ Criterios de Aceptación
- [ ] Factory para User
- [ ] Factory para Company
- [ ] Factory para Employee
- [ ] Factory para PayrollCalendar
- [ ] Fixtures precargados (admin user, test company)

### 🔧 Implementación Sugerida

```typescript
// test/factories/user.factory.ts
import { User } from '../../src/modules/auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

export const createUser = async (overrides?: Partial<User>): Promise<User> => {
  return {
    id: 1,
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password123', 12),
    nombre: 'Test',
    apellido: 'User',
    estado: 1,
    ...overrides,
  } as User;
};
```

---

## 📊 Progreso Testing

- [ ] ISSUE-001: Infraestructura
- [ ] ISSUE-002: AuthService
- [ ] ISSUE-003: CompaniesService
- [ ] ISSUE-004: EmployeesService
- [ ] ISSUE-005: PayrollService
- [ ] ISSUE-006: PermissionsGuard
- [ ] ISSUE-007: EmployeeCreationWorkflow
- [ ] ISSUE-008: Auth E2E
- [ ] ISSUE-009: Companies E2E
- [ ] ISSUE-010: Permissions E2E
- [ ] ISSUE-011: Coverage reporting
- [ ] ISSUE-012: Fixtures y factories

**Total:** 0/12 completados (0%)
