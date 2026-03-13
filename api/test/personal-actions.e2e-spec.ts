import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { ensureE2ELogin } from './e2e-auth.helper';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require('supertest');

jest.setTimeout(180000);

type CatalogItem = Record<string, unknown>;
type SupertestRequestBuilder = {
  get: (url: string) => any;
  post: (url: string) => any;
  patch: (url: string) => any;
};

interface FlowContext {
  companyId: number;
  employeeId: number;
  payrollId: number;
  movementId: number;
}

interface OvertimeBulkFlowContext {
  companyId: number;
  payrollId: number;
  employeeId: number;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intVal = Math.trunc(parsed);
  return intVal > 0 ? intVal : null;
}

function asArray(body: unknown): CatalogItem[] {
  if (Array.isArray(body)) return body as CatalogItem[];
  if (body && typeof body === 'object') {
    const typedBody = body as Record<string, unknown>;
    const data = typedBody.data;
    if (Array.isArray(data)) return data as CatalogItem[];
    const firstArray = Object.values(typedBody).find((value) => Array.isArray(value));
    if (Array.isArray(firstArray)) return firstArray as CatalogItem[];
  }
  return [];
}

function extractActionId(payload: unknown): number {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Respuesta sin payload de accion');
  }
  const actionId = toPositiveInt((payload as { id?: unknown }).id);
  if (!actionId) {
    throw new Error('No se pudo extraer id de accion en la respuesta');
  }
  return actionId;
}

function parseMoney(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

describe('PersonalActions (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestRequestBuilder;
  let dataSource: DataSource;
  let accessToken = '';
  let sessionCompanyIds: number[] = [1];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_DISABLE_CSRF = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = app.get(DataSource);
    const requestFactory = typeof supertest === 'function' ? supertest : supertest.default;
    agent = requestFactory.agent(app.getHttpServer()) as SupertestRequestBuilder;

    await ensureOvertimeBulkTables();

    const auth = await ensureE2ELogin(app, {
      requiredPermissions: ['payroll:overtime:bulk-upload'],
    });
    accessToken = String(auth.accessToken ?? '');
    sessionCompanyIds = asArray(auth.session?.companies).reduce<number[]>(
      (acc, company) => {
        const parsed = toPositiveInt(company.id) ?? toPositiveInt(company.idEmpresa);
        if (parsed) acc.push(parsed);
        return acc;
      },
      [1],
    );
    expect(accessToken.length).toBeGreaterThan(20);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function withAuth(requestBuilder: any): any {
    if (accessToken) {
      requestBuilder.set('Authorization', `Bearer ${accessToken}`);
    }
    return requestBuilder;
  }

  async function ensureOvertimeBulkTables(): Promise<void> {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS acc_horas_extras_cargas_masivas (
        id_carga_masiva INT AUTO_INCREMENT PRIMARY KEY,
        public_id_carga_masiva VARCHAR(80) NOT NULL,
        id_empresa INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_usuario_ejecutor INT NOT NULL,
        nombre_archivo_original VARCHAR(255) NOT NULL,
        hash_archivo_sha256 VARCHAR(128) NOT NULL,
        total_filas_archivo INT NOT NULL DEFAULT 0,
        total_filas_validas INT NOT NULL DEFAULT 0,
        total_filas_no_procesables INT NOT NULL DEFAULT 0,
        total_filas_error_bloqueante INT NOT NULL DEFAULT 0,
        estado_carga_masiva ENUM('UPLOADED','PREVIEW_OK','PREVIEW_WITH_WARNINGS','COMMIT_OK','COMMIT_FAILED') NOT NULL DEFAULT 'UPLOADED',
        mensaje_resumen_carga_masiva TEXT NULL,
        metadata_carga_masiva JSON NULL,
        fecha_creacion_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_hex_carga_empresa_planilla (id_empresa, id_calendario_nomina),
        INDEX idx_hex_carga_usuario (id_usuario_ejecutor),
        INDEX idx_hex_carga_hash (hash_archivo_sha256),
        INDEX idx_hex_carga_estado (estado_carga_masiva),
        UNIQUE KEY uq_hex_carga_public_id (public_id_carga_masiva)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS acc_horas_extras_cargas_masivas_lineas (
        id_carga_masiva_linea INT AUTO_INCREMENT PRIMARY KEY,
        id_carga_masiva INT NOT NULL,
        numero_fila_excel INT NOT NULL,
        codigo_empleado VARCHAR(120) NOT NULL,
        nombre_empleado_excel VARCHAR(255) NULL,
        id_empleado INT NULL,
        id_movimiento_nomina INT NULL,
        tipo_jornada_horas_extras_linea ENUM('6','7','8') NULL,
        cantidad_horas_linea INT NULL,
        fecha_inicio_hora_extra_linea DATE NULL,
        fecha_fin_hora_extra_linea DATE NULL,
        salario_base_empleado_linea DECIMAL(12,2) NULL,
        monto_calculado_linea DECIMAL(12,2) NULL,
        formula_calculo_linea TEXT NULL,
        hash_huella_linea_sha256 VARCHAR(128) NULL,
        estado_linea_carga_masiva ENUM('VALIDA','NO_PROCESABLE','ERROR_BLOQUEANTE','PROCESADA') NOT NULL DEFAULT 'NO_PROCESABLE',
        mensaje_linea_carga_masiva TEXT NULL,
        fecha_creacion_linea_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_linea_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_hex_carga_linea_carga
          FOREIGN KEY (id_carga_masiva) REFERENCES acc_horas_extras_cargas_masivas(id_carga_masiva)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_hex_carga_linea_carga (id_carga_masiva),
        INDEX idx_hex_carga_linea_estado (estado_linea_carga_masiva),
        INDEX idx_hex_carga_linea_empleado (id_empleado),
        INDEX idx_hex_carga_linea_hash (hash_huella_linea_sha256),
        UNIQUE KEY uq_hex_carga_linea_hash_upload (id_carga_masiva, hash_huella_linea_sha256)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  async function findFlowContext(actionTypeId: number): Promise<FlowContext | null> {
    const companyIds = [...new Set(sessionCompanyIds)].filter((id) => id > 0);
    for (const companyId of companyIds) {
      const movements = await dataSource.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = ?
          AND es_inactivo_movimiento_nomina = 1
        ORDER BY id_movimiento_nomina ASC
        LIMIT 1
        `,
        [companyId, actionTypeId],
      );
      if (!movements?.[0]) continue;
      const movementId = toPositiveInt((movements[0] as { id?: unknown }).id);
      if (!movementId) continue;

      const contexts = await dataSource.query(
        `
        SELECT
          e.id_empleado AS employeeId,
          c.id_calendario_nomina AS payrollId
        FROM sys_empleados e
        INNER JOIN nom_calendarios_nomina c
          ON c.id_empresa = e.id_empresa
          AND c.id_periodos_pago = e.id_periodos_pago
          AND c.moneda_calendario_nomina = UPPER(e.moneda_salario_empleado)
        WHERE e.id_empresa = ?
          AND e.estado_empleado = 1
          AND e.id_periodos_pago IS NOT NULL
          AND e.moneda_salario_empleado IS NOT NULL
          AND c.es_inactivo = 0
          AND c.estado_calendario_nomina IN (1, 2)
          AND c.fecha_fin_pago >= CURDATE()
        ORDER BY c.fecha_inicio_periodo ASC, c.id_calendario_nomina ASC
        LIMIT 1
        `,
        [companyId],
      );
      if (!contexts?.[0]) continue;
      const employeeId = toPositiveInt((contexts[0] as { employeeId?: unknown }).employeeId);
      const payrollId = toPositiveInt((contexts[0] as { payrollId?: unknown }).payrollId);
      if (!employeeId || !payrollId) continue;

      return { companyId, employeeId, payrollId, movementId };
    }
    return null;
  }

  async function findOvertimeBulkFlowContext(): Promise<OvertimeBulkFlowContext | null> {
    const base = await findFlowContext(20);
    if (!base) return null;
    return {
      companyId: base.companyId,
      payrollId: base.payrollId,
      employeeId: base.employeeId,
    };
  }

  it('debe completar flujo e2e de Ausencias (crear -> editar -> avanzar -> invalidar)', async () => {
    const context = await findFlowContext(20);
    if (!context) {
      return;
    }
    const ctx = context as FlowContext;
    const today = new Date().toISOString().slice(0, 10);

    const createResponse = await withAuth(agent.post('/personal-actions/ausencias')).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E Ausencia create',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoAusencia: 'JUSTIFICADA',
          cantidad: 1,
          monto: 1500,
          remuneracion: true,
          formula: 'E2E formula ausencia',
        },
      ],
    });
    expect([200, 201]).toContain(createResponse.status);
    const createdId = extractActionId(createResponse.body);
    expect(toPositiveInt(createResponse.body.estado)).toBe(2);

    const updateResponse = await withAuth(
      agent.patch(`/personal-actions/ausencias/${createdId}`),
    ).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E Ausencia update',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoAusencia: 'NO_JUSTIFICADA',
          cantidad: 2,
          monto: 2500,
          remuneracion: false,
          formula: 'E2E formula ausencia update',
        },
      ],
    });
    expect(updateResponse.status).toBe(200);
    expect(toPositiveInt(updateResponse.body.id)).toBe(createdId);

    const advanceResponse = await withAuth(
      agent.patch(`/personal-actions/ausencias/${createdId}/advance`),
    ).send({ idEmpresa: ctx.companyId });
    expect(advanceResponse.status).toBe(200);
    expect(toPositiveInt(advanceResponse.body.estado)).toBe(3);

    const invalidateResponse = await withAuth(
      agent.patch(`/personal-actions/ausencias/${createdId}/invalidate`),
    ).send({ idEmpresa: ctx.companyId, motivo: 'E2E invalidacion ausencia' });
    expect(invalidateResponse.status).toBe(200);
    expect(toPositiveInt(invalidateResponse.body.estado)).toBe(7);
    expect(String(invalidateResponse.body.invalidatedByType ?? '')).toBe('USER');
  }, 120000);

  it('debe completar flujo e2e de Licencias (crear -> editar -> avanzar -> invalidar)', async () => {
    const context = await findFlowContext(23);
    if (!context) {
      return;
    }
    const ctx = context as FlowContext;
    const today = new Date().toISOString().slice(0, 10);

    const createResponse = await withAuth(agent.post('/personal-actions/licencias')).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E Licencia create',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoLicencia: 'permiso_con_goce',
          cantidad: 1,
          monto: 3200,
          remuneracion: true,
          formula: 'E2E formula licencia',
        },
      ],
    });
    expect([200, 201]).toContain(createResponse.status);
    const createdId = extractActionId(createResponse.body);
    expect(toPositiveInt(createResponse.body.estado)).toBe(2);

    const updateResponse = await withAuth(
      agent.patch(`/personal-actions/licencias/${createdId}`),
    ).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E Licencia update',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoLicencia: 'permiso_sin_goce',
          cantidad: 1.5,
          monto: 4800,
          remuneracion: false,
          formula: 'E2E formula licencia update',
        },
      ],
    });
    expect(updateResponse.status).toBe(200);
    expect(toPositiveInt(updateResponse.body.id)).toBe(createdId);

    const advanceResponse = await withAuth(
      agent.patch(`/personal-actions/licencias/${createdId}/advance`),
    ).send({});
    expect(advanceResponse.status).toBe(200);
    expect(toPositiveInt(advanceResponse.body.estado)).toBe(3);

    const invalidateResponse = await withAuth(
      agent.patch(`/personal-actions/licencias/${createdId}/invalidate`),
    ).send({ motivo: 'E2E invalidacion licencia' });
    expect(invalidateResponse.status).toBe(200);
    expect(toPositiveInt(invalidateResponse.body.estado)).toBe(7);
    expect(String(invalidateResponse.body.invalidatedByType ?? '')).toBe('USER');
  }, 120000);

  it('bloquea create/approve/invalidate cuando empleado esta marcado+verificado en planilla', async () => {
    const context = await findFlowContext(20);
    if (!context) return;

    const ctx = context as FlowContext;
    const today = new Date().toISOString().slice(0, 10);

    const createPendingResponse = await withAuth(agent.post('/personal-actions/ausencias')).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E lock baseline action',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoAusencia: 'JUSTIFICADA',
          cantidad: 1,
          monto: 1000,
          remuneracion: true,
          formula: 'E2E lock baseline formula',
        },
      ],
    });
    expect([200, 201]).toContain(createPendingResponse.status);
    const actionId = extractActionId(createPendingResponse.body);

    await dataSource.query(
      `
      INSERT INTO nomina_empleado_verificado
        (id_verificacion, id_nomina, id_empleado, verificado_empleado, incluido_planilla_empleado, requiere_revalidacion_empleado, verificado_por, fecha_verificacion, fecha_modificacion_verificacion)
      VALUES
        (NULL, ?, ?, 1, 1, 0, NULL, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        verificado_empleado = 1,
        incluido_planilla_empleado = 1,
        requiere_revalidacion_empleado = 0,
        fecha_modificacion_verificacion = NOW()
      `,
      [ctx.payrollId, ctx.employeeId],
    );

    const approveResponse = await withAuth(agent.patch(`/personal-actions/${actionId}/approve`)).send({
      payrollId: ctx.payrollId,
    });
    expect(approveResponse.status).toBe(400);
    expect(String(approveResponse.body?.message ?? '')).toContain(
      'No se pueden agregar acciones',
    );

    const invalidateResponse = await withAuth(
      agent.patch(`/personal-actions/ausencias/${actionId}/invalidate`),
    ).send({
      motivo: 'E2E lock invalidate check',
    });
    expect(invalidateResponse.status).toBe(400);
    expect(String(invalidateResponse.body?.message ?? '')).toContain(
      'No se pueden agregar acciones',
    );

    const createBlockedResponse = await withAuth(agent.post('/personal-actions/ausencias')).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E lock create blocked',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          tipoAusencia: 'JUSTIFICADA',
          cantidad: 1,
          monto: 1000,
          remuneracion: true,
          formula: 'E2E lock create formula',
        },
      ],
    });
    expect(createBlockedResponse.status).toBe(400);
    expect(String(createBlockedResponse.body?.message ?? '')).toContain(
      'No se pueden agregar acciones',
    );
  }, 120000);

  it('recalcula montos exactos tras aprobar descuento en planilla', async () => {
    const context = await findFlowContext(6);
    if (!context) return;

    const ctx = context as FlowContext;
    const today = new Date().toISOString().slice(0, 10);
    const descuentoMonto = 1234.0;

    await dataSource.query(
      `
      INSERT INTO nomina_empleado_verificado
        (id_verificacion, id_nomina, id_empleado, verificado_empleado, incluido_planilla_empleado, requiere_revalidacion_empleado, verificado_por, fecha_verificacion, fecha_modificacion_verificacion)
      VALUES
        (NULL, ?, ?, 0, 0, 0, NULL, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        verificado_empleado = 0,
        incluido_planilla_empleado = 0,
        requiere_revalidacion_empleado = 0,
        fecha_modificacion_verificacion = NOW()
      `,
      [ctx.payrollId, ctx.employeeId],
    );

    const beforeLoad = await withAuth(agent.patch(`/payroll/${ctx.payrollId}/load-table`)).send({});
    expect([200, 201]).toContain(beforeLoad.status);
    const beforeRows = asArray(beforeLoad.body?.empleados);
    const beforeRow = beforeRows.find((row) => toPositiveInt(row.idEmpleado) === ctx.employeeId);
    expect(beforeRow).toBeDefined();
    const netoBefore = parseMoney(beforeRow?.totalNeto);

    const createDiscountResponse = await withAuth(agent.post('/personal-actions/descuentos')).send({
      idEmpresa: ctx.companyId,
      idEmpleado: ctx.employeeId,
      observacion: 'E2E descuento exacto',
      lines: [
        {
          payrollId: ctx.payrollId,
          fechaEfecto: today,
          movimientoId: ctx.movementId,
          cantidad: 1,
          monto: descuentoMonto,
          formula: 'E2E descuento exacto',
        },
      ],
    });
    expect([200, 201]).toContain(createDiscountResponse.status);
    const discountActionId = extractActionId(createDiscountResponse.body);

    const approveResponse = await withAuth(
      agent.patch(`/personal-actions/${discountActionId}/approve`),
    ).send({ payrollId: ctx.payrollId });
    expect(approveResponse.status).toBe(200);

    const afterLoad = await withAuth(agent.patch(`/payroll/${ctx.payrollId}/load-table`)).send({});
    expect([200, 201]).toContain(afterLoad.status);
    const afterRows = asArray(afterLoad.body?.empleados);
    const afterRow = afterRows.find((row) => toPositiveInt(row.idEmpleado) === ctx.employeeId);
    expect(afterRow).toBeDefined();
    const netoAfter = parseMoney(afterRow?.totalNeto);

    expect(Number((netoBefore - descuentoMonto).toFixed(2))).toBe(netoAfter);

    const acciones = asArray(afterRow?.acciones);
    const approvedDiscount = acciones.find(
      (row) =>
        String(row.tipoAccion ?? '').trim().toLowerCase() === 'descuento' &&
        parseMoney(row.monto) === Number(descuentoMonto.toFixed(2)) &&
        String(row.estado ?? '').trim().toLowerCase().includes('aprobad'),
    );
    expect(approvedDiscount).toBeDefined();
  }, 120000);

  it('ejecuta flujo e2e simulado de carga masiva horas extra (template -> preview -> commit)', async () => {
    const context = await findOvertimeBulkFlowContext();
    if (!context) return;

    const templateResponse = await withAuth(
      agent.get(
        `/personal-actions/horas-extras/carga-masiva/template-data?idEmpresa=${context.companyId}&payrollId=${context.payrollId}`,
      ),
    ).send();
    expect(templateResponse.status).toBe(200);

    const templateMovements = asArray(templateResponse.body?.movimientos);
    expect(templateMovements.length).toBeGreaterThan(0);
    const firstMovementId = toPositiveInt(templateMovements[0]?.id);
    expect(firstMovementId).toBeGreaterThan(0);

    const today = new Date().toISOString().slice(0, 10);
    const fileHashSha256 = `e2e${Date.now().toString(16)}${Math.random().toString(16).slice(2, 34)}`.slice(
      0,
      64,
    );
    const employeeCode = `KPid-${context.employeeId}-E2E`;

    const previewResponse = await withAuth(
      agent.post('/personal-actions/horas-extras/carga-masiva/preview'),
    ).send({
      idEmpresa: context.companyId,
      payrollId: context.payrollId,
      fileName: 'e2e-carga-masiva-horas.xlsx',
      fileHashSha256,
      rows: [
        {
          rowNumber: 2,
          nombreCompleto: 'E2E Empleado',
          codigoEmpleado: employeeCode,
          movimientoId: firstMovementId,
          tipoJornadaHorasExtras: '8',
          cantidadHoras: 2,
          fechaInicioHoraExtra: today,
          fechaFinHoraExtra: today,
        },
      ],
    });
    expect(previewResponse.status).toBe(201);
    expect(String(previewResponse.body?.uploadPublicId ?? '')).toContain('hex');
    expect(toPositiveInt(previewResponse.body?.resumen?.validas)).toBe(1);

    const uploadPublicId = String(previewResponse.body?.uploadPublicId ?? '');
    expect(uploadPublicId.length).toBeGreaterThan(10);

    const commitResponse = await withAuth(
      agent.post('/personal-actions/horas-extras/carga-masiva/commit'),
    ).send({
      uploadPublicId,
      idEmpresa: context.companyId,
      payrollId: context.payrollId,
      observacion: 'E2E commit carga masiva horas',
    });
    expect(commitResponse.status).toBe(201);
    expect(toPositiveInt(commitResponse.body?.resumen?.accionesCreadas)).toBe(1);
    expect(toPositiveInt(commitResponse.body?.resumen?.lineasProcesadas)).toBe(1);

    const uploadStatusRows = await dataSource.query(
      `
      SELECT estado_carga_masiva AS estado
      FROM acc_horas_extras_cargas_masivas
      WHERE public_id_carga_masiva = ?
      LIMIT 1
      `,
      [uploadPublicId],
    );
    expect(String(uploadStatusRows?.[0]?.estado ?? '')).toBe('COMMIT_OK');

    const createdActionRows = await dataSource.query(
      `
      SELECT id_accion AS id, estado_accion AS estado
      FROM acc_acciones_personal
      WHERE id_calendario_nomina = ?
        AND id_empleado = ?
        AND tipo_accion = 'hora_extra'
        AND descripcion_accion LIKE CONCAT('%', ?, '%')
      ORDER BY id_accion DESC
      LIMIT 1
      `,
      [context.payrollId, context.employeeId, uploadPublicId],
    );
    expect(createdActionRows.length).toBeGreaterThan(0);
    expect(toPositiveInt(createdActionRows[0]?.estado)).toBe(5);
  }, 120000);
});



