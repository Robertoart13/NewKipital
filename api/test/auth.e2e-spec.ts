import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

import { ensureE2ELogin } from './e2e-auth.helper';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken = '';
  let loginEmail = '';
  let loginPassword = '';
  let firstCompanyId = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_DISABLE_CSRF = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const auth = await ensureE2ELogin(app);
    accessToken = auth.accessToken;
    loginEmail = auth.email;
    loginPassword = auth.password;

    const companies = Array.isArray(auth.session?.companies)
      ? (auth.session?.companies as Array<{ id?: number | string }>)
      : [];
    const companyId = Number(companies[0]?.id ?? 1);
    firstCompanyId = Number.isFinite(companyId) && companyId > 0 ? companyId : 1;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login should login with valid credentials', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: loginEmail,
      password: loginPassword,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', loginEmail);
    expect(Array.isArray(response.body.companies)).toBe(true);
  });

  it('POST /auth/login should reject invalid password', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({
      email: loginEmail,
      password: 'WrongPassword123!',
    }).expect(401);
  });

  it('GET /auth/me should return current session with bearer token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('GET /auth/me should reject missing token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('POST /auth/switch-company should switch context with valid token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/switch-company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId: firstCompanyId, appCode: 'kpital' })
      .expect(201);

    expect(response.body).toHaveProperty('companyId');
    expect(response.body).toHaveProperty('permissions');
  });

  it('POST /auth/refresh should reject without refresh cookie in test env', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/login').send({
      email: loginEmail,
      password: loginPassword,
    }).expect(201);

    await agent.post('/auth/refresh').send({}).expect(401);
  });

  it('POST /auth/refresh should reject request without refresh cookie', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
  });

  it('POST /auth/logout should close session with valid bearer token', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);
  });
});

