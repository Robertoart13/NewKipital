import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
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
    const firstArray = Object.values(typedBody).find((value) =>
      Array.isArray(value),
    );
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    const requestFactory =
      typeof supertest === 'function' ? supertest : supertest.default;
    agent = requestFactory.agent(app.getHttpServer()) as SupertestRequestBuilder;

    const authService = app.get(AuthService);
    const issued = await authService.login(
      'ana.garcia@roccacr.com',
      'Demo2026!',
      '127.0.0.1',
      'e2e-test',
    );
    accessToken = String(issued.accessToken ?? '');
    sessionCompanyIds = asArray(issued.session?.companies).reduce<number[]>(
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

  async function findFlowContext(
    actionTypeId: number,
  ): Promise<FlowContext | null> {
    const companyIds = [...new Set(sessionCompanyIds)].filter((id) => id > 0);
    for (const companyId of companyIds) {
      const movements = await dataSource.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = ?
          AND es_inactivo_movimiento_nomina = 0
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
      const employeeId = toPositiveInt(
        (contexts[0] as { employeeId?: unknown }).employeeId,
      );
      const payrollId = toPositiveInt(
        (contexts[0] as { payrollId?: unknown }).payrollId,
      );
      if (!employeeId || !payrollId) continue;

      return { companyId, employeeId, payrollId, movementId };
    }
    return null;
  }

  it(
    'debe completar flujo e2e de Ausencias (crear -> editar -> avanzar -> invalidar)',
    async () => {
      const context = await findFlowContext(20);
      expect(context).not.toBeNull();
      const ctx = context as FlowContext;
      const today = new Date().toISOString().slice(0, 10);

      const createResponse = await withAuth(
        agent.post('/personal-actions/ausencias'),
      )
        .send({
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
      )
        .send({
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
      )
        .send({ idEmpresa: ctx.companyId });
      expect(advanceResponse.status).toBe(200);
      expect(toPositiveInt(advanceResponse.body.estado)).toBe(3);

      const invalidateResponse = await withAuth(
        agent.patch(`/personal-actions/ausencias/${createdId}/invalidate`),
      )
        .send({ idEmpresa: ctx.companyId, motivo: 'E2E invalidacion ausencia' });
      expect(invalidateResponse.status).toBe(200);
      expect(toPositiveInt(invalidateResponse.body.estado)).toBe(7);
      expect(String(invalidateResponse.body.invalidatedByType ?? '')).toBe(
        'USER',
      );
    },
    120000,
  );

  it(
    'debe completar flujo e2e de Licencias (crear -> editar -> avanzar -> invalidar)',
    async () => {
      const context = await findFlowContext(23);
      expect(context).not.toBeNull();
      const ctx = context as FlowContext;
      const today = new Date().toISOString().slice(0, 10);

      const createResponse = await withAuth(
        agent.post('/personal-actions/licencias'),
      )
        .send({
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
      )
        .send({
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
      )
        .send({});
      expect(advanceResponse.status).toBe(200);
      expect(toPositiveInt(advanceResponse.body.estado)).toBe(3);

      const invalidateResponse = await withAuth(
        agent.patch(`/personal-actions/licencias/${createdId}/invalidate`),
      )
        .send({ motivo: 'E2E invalidacion licencia' });
      expect(invalidateResponse.status).toBe(200);
      expect(toPositiveInt(invalidateResponse.body.estado)).toBe(7);
      expect(String(invalidateResponse.body.invalidatedByType ?? '')).toBe(
        'USER',
      );
    },
    120000,
  );
});
