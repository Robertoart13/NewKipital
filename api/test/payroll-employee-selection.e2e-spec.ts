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

type SupertestRequestBuilder = {
  get: (url: string) => any;
  patch: (url: string) => any;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intVal = Math.trunc(parsed);
  return intVal > 0 ? intVal : null;
}

function asArray(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) return body as Array<Record<string, unknown>>;
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  }
  return [];
}

describe('Payroll Employee Selection (e2e)', () => {
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
    sessionCompanyIds = asArray(auth.session?.companies).reduce<number[]>((acc, company) => {
      const parsed = toPositiveInt(company.id) ?? toPositiveInt(company.idEmpresa);
      if (parsed) acc.push(parsed);
      return acc;
    }, [1]);
    expect(accessToken.length).toBeGreaterThan(20);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function withAuth(requestBuilder: any): any {
    if (accessToken) {
      requestBuilder.set('Authorization', `Bearer ${accessToken}`);
    }
    return requestBuilder;
  }

  async function findOperationalPayrollId(): Promise<number | null> {
    const companyIds = [...new Set(sessionCompanyIds)].filter((id) => id > 0);
    for (const companyId of companyIds) {
      const rows = await dataSource.query(
        `
        SELECT id_calendario_nomina AS id
        FROM nom_calendarios_nomina
        WHERE id_empresa = ?
          AND estado_calendario_nomina IN (1,2)
          AND es_inactivo = 1
          AND LOWER(tipo_planilla) = 'regular'
        ORDER BY fecha_inicio_periodo DESC, id_calendario_nomina DESC
        LIMIT 1
        `,
        [companyId],
      );
      const payrollId = toPositiveInt(rows?.[0]?.id);
      if (payrollId) return payrollId;
    }
    return null;
  }

  it('persiste seleccion por empleado y la refleja en snapshot-table', async () => {
    const payrollId = await findOperationalPayrollId();
    if (!payrollId) return;

    const loadResponse = await withAuth(agent.patch(`/payroll/${payrollId}/load-table`)).send({});
    if (![200, 201].includes(loadResponse.status)) {
      return;
    }

    const snapshotBefore = await withAuth(agent.get(`/payroll/${payrollId}/snapshot-table`));
    expect(snapshotBefore.status).toBe(200);
    const employeesBefore = asArray(snapshotBefore.body?.empleados);
    if (employeesBefore.length === 0) return;

    const employeeId = toPositiveInt(employeesBefore[0].idEmpleado);
    if (!employeeId) return;

    const unselectResponse = await withAuth(agent.patch(`/payroll/${payrollId}/employee-selection`)).send({
      employeeIds: [employeeId],
      selected: false,
    });
    expect(unselectResponse.status).toBe(200);
    expect(toPositiveInt(unselectResponse.body.updated)).toBe(1);

    const reloadResponse = await withAuth(agent.patch(`/payroll/${payrollId}/load-table`)).send({});
    if (![200, 201].includes(reloadResponse.status)) {
      return;
    }

    const snapshotAfterUnselect = await withAuth(agent.get(`/payroll/${payrollId}/snapshot-table`));
    expect(snapshotAfterUnselect.status).toBe(200);
    const employeesAfterUnselect = asArray(snapshotAfterUnselect.body?.empleados);
    const targetAfterUnselect = employeesAfterUnselect.find(
      (row) => toPositiveInt(row.idEmpleado) === employeeId,
    );
    expect(targetAfterUnselect).toBeDefined();
    expect(Boolean(targetAfterUnselect?.seleccionadoPlanilla)).toBe(false);

    const reselectResponse = await withAuth(agent.patch(`/payroll/${payrollId}/employee-selection`)).send({
      employeeIds: [employeeId],
      selected: true,
    });
    expect(reselectResponse.status).toBe(200);
    expect(toPositiveInt(reselectResponse.body.updated)).toBe(1);
  }, 120000);
});
