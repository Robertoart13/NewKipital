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

    const auth = await ensureE2ELogin(app);
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
});



