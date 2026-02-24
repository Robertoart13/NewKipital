# 🔥 BACKEND CRITICAL - Issues Pendientes

**Prioridad Global:** P0-P1 (CRÍTICO/ALTO)
**Esfuerzo Total:** 1-2 semanas
**Asignado a:** [Sin asignar]

---

## ISSUE-036: PEND-001 - Validación bloqueo de empresa con planillas activas

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [backend] [bug] [validation]

### 📝 Descripción
**BUG CRÍTICO:** CompaniesService.inactivate() permite inactivar empresa aunque tenga planillas activas, causando inconsistencia de datos.

**Impacto:** Datos huérfanos, reportes incorrectos, pérdida de integridad referencial.

### 📁 Archivos Afectados
- `api/src/modules/companies/companies.service.ts` (línea 350-376)
- `api/src/modules/payroll/payroll.service.ts` (añadir helper)

### ✅ Criterios de Aceptación
- [ ] inactivate() valida que NO hay planillas en estados operativos
- [ ] Estados operativos: ABIERTA, EN_PROCESO, VERIFICADA
- [ ] Si hay planillas activas: lanza BadRequestException con detalle
- [ ] Mensaje de error: "No se puede inactivar: hay X planillas activas"
- [ ] Test unitario: intento de inactivar con planillas → 400
- [ ] Test unitario: inactivar sin planillas → 200

### 🔧 Implementación Sugerida

```typescript
// companies.service.ts
import { PayrollCalendar, EstadoCalendarioNomina } from '../payroll/entities/payroll-calendar.entity';

export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    // ...otros
  ) {}

  async inactivate(id: number, userId: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    await this.assertUserCompanyAccess(userId, id);

    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    // ✅ VALIDACIÓN CRÍTICA: Verificar planillas activas
    const estadosOperativos = [
      EstadoCalendarioNomina.ABIERTA,
      EstadoCalendarioNomina.EN_PROCESO,
      EstadoCalendarioNomina.VERIFICADA,
    ];

    const planillasActivas = await this.payrollRepo.count({
      where: {
        idEmpresa: id,
        estado: In(estadosOperativos),
        esInactivo: 0,
      },
    });

    if (planillasActivas > 0) {
      throw new BadRequestException(
        `No se puede inactivar la empresa: hay ${planillasActivas} planilla(s) activa(s). ` +
        `Debe aplicar o inactivar las planillas primero.`
      );
    }

    // ✅ VALIDACIÓN OPCIONAL: Verificar empleados activos
    const empleadosActivos = await this.repo.manager.query(
      `SELECT COUNT(*) as count FROM sys_empleados WHERE id_empresa = ? AND estado_empleado = 1`,
      [id],
    );

    if (empleadosActivos[0]?.count > 0) {
      throw new BadRequestException(
        `No se puede inactivar la empresa: hay ${empleadosActivos[0].count} empleado(s) activo(s). ` +
        `Debe inactivar los empleados primero.`
      );
    }

    const before = this.toAuditSnapshot(company);

    company.estado = 0;
    company.fechaInactivacion = new Date();
    company.modificadoPor = userId;
    const saved = await this.repo.save(company);

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'inactivate',
      entidad: 'company',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.id,
      descripcion: `Empresa inactivada: ${saved.nombre}`,
      payloadBefore: before,
      payloadAfter: this.toAuditSnapshot(saved),
    });

    return this.mapCompanyWithLogo(saved);
  }
}
```

### 🧪 Cómo Verificar

```typescript
// companies.service.spec.ts
describe('CompaniesService - inactivate', () => {
  it('debe lanzar error si hay planillas activas', async () => {
    const company = await createCompany({ id: 1 });
    const payroll = await createPayroll({
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.ABIERTA,
    });

    await expect(
      service.inactivate(1, userId),
    ).rejects.toThrow('No se puede inactivar la empresa: hay 1 planilla(s) activa(s)');
  });

  it('debe permitir inactivar si todas las planillas están aplicadas', async () => {
    const company = await createCompany({ id: 1 });
    const payroll = await createPayroll({
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.APLICADA,
    });

    const result = await service.inactivate(1, userId);
    expect(result.estado).toBe(0);
  });
});
```

---

## ISSUE-037: Recálculo automático de acciones de personal

**Prioridad:** P0
**Esfuerzo:** M (3-5 días)
**Etiquetas:** [backend] [feature] [payroll]

### 📝 Descripción
**FEATURE FALTANTE:** Cuando se aprueba una acción de personal (aumento salarial, bono), la planilla abierta NO se recalcula automáticamente.

**Documentado en:** Doc 10, Doc 30
**Estado actual:** Evento PERSONAL_ACTION.APPROVED se emite pero NO hay listeners.

### 📁 Archivos Afectados
- `api/src/modules/payroll/listeners/payroll-recalculation.listener.ts` (crear)
- `api/src/modules/payroll/payroll.service.ts` (añadir método recalculate)
- `api/src/modules/personal-actions/personal-actions.service.ts`

### ✅ Criterios de Aceptación
- [ ] @OnEvent listener para PERSONAL_ACTION.APPROVED
- [ ] Listener busca planilla abierta para el empleado/empresa
- [ ] Si existe planilla ABIERTA o EN_PROCESO: recalcula
- [ ] Recálculo actualiza montos pero NO cambia estado
- [ ] Si planilla está VERIFICADA/APLICADA: NO recalcula (inmutable)
- [ ] Logging de cada recálculo
- [ ] Tests unitarios: aprobar acción → recálculo automático

### 🔧 Implementación Sugerida

```typescript
// payroll/listeners/payroll-recalculation.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../common/events/event-names';
import { PayrollService } from '../payroll.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PayrollCalendar, EstadoCalendarioNomina } from '../entities/payroll-calendar.entity';
import { Employee } from '../../employees/entities/employee.entity';

interface PersonalActionApprovedEvent {
  eventName: string;
  occurredAt: Date;
  payload: {
    actionId: string;
    employeeId: string;
    companyId: string;
  };
}

@Injectable()
export class PayrollRecalculationListener {
  private readonly logger = new Logger(PayrollRecalculationListener.name);

  constructor(
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly payrollService: PayrollService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED)
  async handlePersonalActionApproved(event: PersonalActionApprovedEvent) {
    const { employeeId, companyId, actionId } = event.payload;

    this.logger.log(`Procesando recálculo por acción ${actionId} para empleado ${employeeId}`);

    // Buscar planillas abiertas de la empresa
    const openPayrolls = await this.payrollRepo.find({
      where: {
        idEmpresa: parseInt(companyId),
        estado: In([
          EstadoCalendarioNomina.ABIERTA,
          EstadoCalendarioNomina.EN_PROCESO,
        ]),
        esInactivo: 0,
      },
    });

    if (openPayrolls.length === 0) {
      this.logger.debug(`No hay planillas abiertas para empresa ${companyId}, skip recálculo`);
      return;
    }

    for (const payroll of openPayrolls) {
      try {
        await this.payrollService.recalculateForEmployee(payroll.id, parseInt(employeeId));

        this.logger.log(
          `Recálculo exitoso: planilla ${payroll.id}, empleado ${employeeId}, acción ${actionId}`
        );
      } catch (error) {
        this.logger.error(
          `Error recalculando planilla ${payroll.id} para empleado ${employeeId}`,
          error.stack,
        );
        // NO lanzar error, continuar con otras planillas
      }
    }
  }
}

// payroll.service.ts
export class PayrollService {
  async recalculateForEmployee(payrollId: number, employeeId: number): Promise<void> {
    const payroll = await this.findOne(payrollId);

    if (payroll.estado === EstadoCalendarioNomina.VERIFICADA ||
        payroll.estado === EstadoCalendarioNomina.APLICADA ||
        payroll.estado === EstadoCalendarioNomina.CONTABILIZADA) {
      throw new BadRequestException('No se puede recalcular una planilla verificada/aplicada');
    }

    // Obtener empleado con salario actualizado
    const employee = await this.repo.manager.findOne(Employee, {
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Empleado ${employeeId} no encontrado`);
    }

    // TODO: Lógica de recálculo según tipo de planilla
    // Por ahora, solo logging
    this.logger.log(`Recalculando empleado ${employeeId} en planilla ${payrollId}`);

    // Incrementar versionLock para optimistic locking
    payroll.versionLock += 1;
    await this.repo.save(payroll);
  }
}
```

---

## ISSUE-038: Implementar listeners de eventos de dominio

**Prioridad:** P1
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [backend] [events] [architecture]

### 📝 Descripción
**FEATURE FALTANTE:** Eventos de dominio se emiten pero NO hay listeners implementados.

**Eventos emitidos sin listeners:**
- `PAYROLL.OPENED`
- `PAYROLL.VERIFIED`
- `PAYROLL.APPLIED`
- `PERSONAL_ACTION.CREATED`
- `EMPLOYEE.CREATED`

### ✅ Criterios de Aceptación
- [ ] Listener para PAYROLL.OPENED → enviar notificación a RRHH
- [ ] Listener para PAYROLL.APPLIED → trigger contabilización (Fase 3)
- [ ] Listener para EMPLOYEE.CREATED → enviar email bienvenida
- [ ] Cada listener con logging
- [ ] Tests unitarios de cada listener

---

## ISSUE-039: Aplicación de planilla sin enforcement de estados

**Prioridad:** P1
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [backend] [bug] [payroll]

### 📝 Descripción
**BUG:** PayrollService.apply() tiene validación de estado VERIFICADA, pero NO impide aplicar múltiples veces si se llama concurrentemente.

**Riesgo:** Planilla aplicada 2 veces = pagos duplicados.

### ✅ Criterios de Aceptación
- [ ] apply() usa optimistic locking (versionLock) ✅ YA IMPLEMENTADO
- [ ] Añadir constraint UNIQUE en BD: (id_empresa, periodo, tipo, estado=APLICADA)
- [ ] Test: aplicar 2 veces concurrentemente → solo 1 éxito
- [ ] Test: aplicar después de aplicada → 409 Conflict

### 🔧 Implementación Sugerida

```typescript
// Migración
export class AddUniqueConstraintPayroll implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_payroll_unique_applied
      ON nom_calendarios_nomina (
        id_empresa,
        fecha_inicio_periodo_nomina,
        fecha_fin_periodo_nomina,
        tipo_planilla_nomina
      )
      WHERE estado_calendario_nomina = 'Aplicada' AND es_inactivo_calendario_nomina = 0
    `);
  }
}
```

---

## ISSUE-040: Historial laboral incompleto (tablas faltantes)

**Prioridad:** P1
**Esfuerzo:** S (1-2 días)
**Etiquetas:** [backend] [database] [migration]

### 📝 Descripción
**FEATURE FALTANTE:** Docs mencionan tabla `sys_empleado_provision_aguinaldo` pero NO existe en migraciones.

**Documentado en:** Doc 23, Doc 30

### ✅ Criterios de Aceptación
- [ ] Migración crea tabla `sys_empleado_provision_aguinaldo`
- [ ] Columnas:
  - id_provision
  - id_empleado (FK)
  - anio
  - meses_acumulados
  - monto_provision
  - fecha_calculo
  - estado
- [ ] Entity `EmployeeAguinaldoProvision`
- [ ] Endpoint GET /api/employees/:id/provisiones

---

## ISSUE-041: Colas de procesamiento no implementadas

**Prioridad:** P1
**Esfuerzo:** L (1 semana)
**Etiquetas:** [backend] [infrastructure] [queues]

### 📝 Descripción
**FEATURE FALTANTE:** Docs mencionan colas (identity sync, encryption) pero tablas NO existen y Redis no configurado.

**Documentado en:** Doc 01, Doc 04, automatizaciones/

### ✅ Criterios de Aceptación
- [ ] Redis instalado y configurado
- [ ] BullMQ integrado
- [ ] Colas:
  - `identity-sync-queue`
  - `employee-encryption-queue`
  - `payroll-calculation-queue`
- [ ] Worker processors para cada cola
- [ ] Dashboard de monitoreo: Bull Board
- [ ] Dead Letter Queue configurada
- [ ] Retry policy: exponential backoff

### 🔧 Implementación Sugerida

```typescript
// queues.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'identity-sync' },
      { name: 'employee-encryption' },
      { name: 'payroll-calculation' },
    ),
  ],
})
export class QueuesModule {}

// identity-sync.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('identity-sync')
export class IdentitySyncProcessor {
  @Process()
  async handleIdentitySync(job: Job) {
    const { userId, changes } = job.data;
    // Lógica de sincronización
  }
}
```

---

## ISSUE-042: Rate limiting no integrado

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [backend] [security]

### 📝 Descripción
**SECURITY GAP:** AuthRateLimitService existe pero NO se usa en AuthController.

**Riesgo:** Brute force attacks sin límite.

### ✅ Criterios de Aceptación
- [ ] @UseGuards(ThrottlerGuard) en POST /auth/login
- [ ] Límite: 5 intentos por minuto por IP
- [ ] Límite: 10 intentos por hora por IP
- [ ] Response 429 Too Many Requests
- [ ] Header: Retry-After con segundos

### 🔧 Implementación Sugerida

```typescript
// auth.controller.ts
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 5 requests por 60 segundos
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}

// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 5,
    }),
  ],
})
export class AppModule {}
```

---

## ISSUE-043: Respuestas HTTP inconsistentes

**Prioridad:** P2
**Esfuerzo:** M (2 días)
**Etiquetas:** [backend] [api] [consistency]

### 📝 Descripción
**INCONSISTENCY:** main.ts define formato `{ success, data, message, error }` pero controllers retornan solo entity.

### ✅ Criterios de Aceptación
- [ ] Interceptor global que envuelve todas las respuestas
- [ ] Formato estándar:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": null,
    "error": null
  }
  ```
- [ ] Errores también en formato estándar
- [ ] Tests E2E verifican formato

---

## 📊 Progreso Backend Critical

- [ ] ISSUE-036: PEND-001 validación bloqueo empresa
- [ ] ISSUE-037: Recálculo automático
- [ ] ISSUE-038: Listeners de eventos
- [ ] ISSUE-039: Enforcement estados planilla
- [ ] ISSUE-040: Historial laboral completo
- [ ] ISSUE-041: Colas de procesamiento
- [ ] ISSUE-042: Rate limiting
- [ ] ISSUE-043: Respuestas HTTP consistentes

**Total:** 0/8 completados (0%)
