import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { ensureE2ELogin } from './e2e-auth.helper';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

jest.setTimeout(120000);

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let permissions: Set<string>;
  let testEmployeeId = 0;
  let testCompanyId = 1;

  const hasPermission = (code: string): boolean => permissions.has(code.toLowerCase());

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const auth = await ensureE2ELogin(app);
    accessToken = auth.accessToken;
    permissions = new Set(auth.permissions.map((p) => p.toLowerCase()));

    const sessionCompanies = Array.isArray(auth.session?.companies)
      ? (auth.session?.companies as Array<{ id?: unknown; idEmpresa?: unknown }>)
      : [];
    const companyFromSession = Number(sessionCompanies[0]?.id ?? sessionCompanies[0]?.idEmpresa ?? 0);
    if (Number.isFinite(companyFromSession) && companyFromSession > 0) {
      testCompanyId = companyFromSession;
    }

    const listResponse = await request(app.getHttpServer())
      .get(`/employees?idEmpresa=${testCompanyId}&page=1&pageSize=1`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const firstEmployeeId = Number(listResponse.body?.data?.[0]?.id ?? 0);
    if (Number.isFinite(firstEmployeeId) && firstEmployeeId > 0) {
      testEmployeeId = firstEmployeeId;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /employees should return paginated list', async () => {
    const response = await request(app.getHttpServer())
      .get(`/employees?idEmpresa=${testCompanyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body?.data)).toBe(true);
    expect(response.body).toHaveProperty('total');
  });

  it('GET /employees should reject unauthenticated', async () => {
    await request(app.getHttpServer()).get(`/employees?idEmpresa=${testCompanyId}`).expect(401);
  });

  it('POST /employees should enforce create permission and validations', async () => {
    const payload = {
      idEmpresa: testCompanyId,
      codigo: `E2EEMP${Date.now()}`,
      cedula: `${Date.now()}`,
      nombre: 'E2E',
      apellido1: 'Employee',
      email: `e2e-emp-${Date.now()}@example.com`,
      fechaIngreso: '2024-01-01',
    };

    const createResponse = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    const expectedCreateStatuses = hasPermission('employee:create') ? [201] : [403];
    expect(expectedCreateStatuses).toContain(createResponse.status);

    if (createResponse.status === 201) {
      const createdId = Number(createResponse.body?.data?.employee?.id ?? 0);
      if (Number.isFinite(createdId) && createdId > 0) {
        testEmployeeId = createdId;
      }
    }

    const invalidEmailResponse = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, codigo: `E2EINV${Date.now()}`, email: 'not-an-email' });

    if (hasPermission('employee:create')) {
      expect(invalidEmailResponse.status).toBe(400);
    } else {
      expect(invalidEmailResponse.status).toBe(403);
    }
  });

  it('GET /employees/:id should return employee when accessible', async () => {
    if (!testEmployeeId) {
      const listResponse = await request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}&page=1&pageSize=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      testEmployeeId = Number(listResponse.body?.data?.[0]?.id ?? 0);
    }

    const response = await request(app.getHttpServer())
      .get(`/employees/${testEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect([200, 403]).toContain(response.status);
  });

  it('PUT /employees/:id should enforce edit permission', async () => {
    const response = await request(app.getHttpServer())
      .put(`/employees/${testEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nombre: 'UpdatedE2E', apellido1: 'UpdatedE2E' });

    const expectedStatuses = hasPermission('employee:edit') ? [200] : [403];
    expect(expectedStatuses).toContain(response.status);
  });

  it('PATCH inactivate/reactivate should enforce permissions', async () => {
    const inactivateResponse = await request(app.getHttpServer())
      .patch(`/employees/${testEmployeeId}/inactivate`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(hasPermission('employee:inactivate') ? [200] : [403]).toContain(inactivateResponse.status);

    const reactivateResponse = await request(app.getHttpServer())
      .patch(`/employees/${testEmployeeId}/reactivate`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(hasPermission('employee:reactivate') ? [200] : [403]).toContain(reactivateResponse.status);
  });

  it('GET /employees/supervisors should respond with or without idEmpresa based on backend contract', async () => {
    await request(app.getHttpServer())
      .get(`/employees/supervisors?idEmpresa=${testCompanyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const withoutCompanyResponse = await request(app.getHttpServer())
      .get('/employees/supervisors')
      .set('Authorization', `Bearer ${accessToken}`);

    expect([200, 400]).toContain(withoutCompanyResponse.status);
  });
});
