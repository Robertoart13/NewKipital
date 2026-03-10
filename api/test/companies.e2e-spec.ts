import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { ensureE2ELogin } from './e2e-auth.helper';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

jest.setTimeout(120000);

describe('CompaniesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let permissions: Set<string>;
  let testCompanyId = 0;

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

    const listResponse = await request(app.getHttpServer())
      .get('/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const firstId = Number(listResponse.body?.[0]?.id ?? 0);
    if (Number.isFinite(firstId) && firstId > 0) {
      testCompanyId = firstId;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /companies should return active companies', async () => {
    const response = await request(app.getHttpServer())
      .get('/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /companies should reject unauthenticated', async () => {
    await request(app.getHttpServer()).get('/companies').expect(401);
  });

  it('POST /companies should enforce create permission', async () => {
    const uniqueId = Date.now();
    const response = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nombre: `Test Company ${uniqueId}`,
        nombreLegal: `Test Company Legal ${uniqueId}`,
        cedula: `310${uniqueId}`,
        prefijo: `TC${String(uniqueId).slice(-6)}`,
        actividadEconomica: 'Software Development',
      });

    expect(hasPermission('company:create') ? [201] : [403]).toContain(response.status);
    if (response.status === 201) {
      const createdId = Number(response.body?.id ?? 0);
      if (Number.isFinite(createdId) && createdId > 0) {
        testCompanyId = createdId;
      }
    }
  });

  it('GET /companies/:id should return company or forbidden based on access', async () => {
    const response = await request(app.getHttpServer())
      .get(`/companies/${testCompanyId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect([200, 403]).toContain(response.status);
  });

  it('PUT /companies/:id should enforce edit permission', async () => {
    const response = await request(app.getHttpServer())
      .put(`/companies/${testCompanyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nombre: `Updated Company ${Date.now()}` });

    expect(hasPermission('company:edit') ? [200] : [403]).toContain(response.status);
  });

  it('PATCH inactivate/reactivate should enforce permissions', async () => {
    const inactivateResponse = await request(app.getHttpServer())
      .patch(`/companies/${testCompanyId}/inactivate`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(hasPermission('company:inactivate') ? [200] : [403]).toContain(inactivateResponse.status);

    const reactivateResponse = await request(app.getHttpServer())
      .patch(`/companies/${testCompanyId}/reactivate`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(hasPermission('company:reactivate') ? [200] : [403]).toContain(reactivateResponse.status);
  });

  it('GET /companies/:id/logo should return image when id is valid', async () => {
    const response = await request(app.getHttpServer())
      .get(`/companies/${testCompanyId}/logo`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect([200, 403]).toContain(response.status);
    if (response.status === 200) {
      expect(String(response.headers['content-type'] ?? '')).toMatch(/^image\//);
    }
  });

  it('GET /companies/:id/audit-trail should respond according to permission/access', async () => {
    const response = await request(app.getHttpServer())
      .get(`/companies/${testCompanyId}/audit-trail`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect([200, 403]).toContain(response.status);
  });
});
