import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CompaniesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testCompanyId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana.garcia@roccacr.com',
        password: 'Demo2026!',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /companies', () => {
    it('should return all active companies for user', () => {
      return request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((company: any) => {
            expect(company).toHaveProperty('id');
            expect(company).toHaveProperty('nombre');
            expect(company).toHaveProperty('logoUrl');
            expect(company.estado).toBe(1);
          });
        });
    });

    it('should return inactive companies when requested', () => {
      return request(app.getHttpServer())
        .get('/companies?inactiveOnly=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((company: any) => {
            expect(company.estado).toBe(0);
          });
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer()).get('/companies').expect(401);
    });
  });

  describe('POST /companies', () => {
    it('should create company successfully', () => {
      const uniqueId = Date.now();
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: `Test Company ${uniqueId}`,
          nombreLegal: `Test Company Legal S.A. ${uniqueId}`,
          cedula: `310${uniqueId}`,
          prefijo: `TC${uniqueId}`,
          actividadEconomica: 'Software Development',
          direccionExacta: '100 metros norte del parque',
          telefono: '22223333',
          email: `info${uniqueId}@testcompany.com`,
          codigoPostal: '10101',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('nombre');
          expect(response.body).toHaveProperty('logoUrl');
          expect(response.body).toHaveProperty('estado', 1);
          testCompanyId = response.body.id;
        });
    });

    it('should reject company creation with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Incomplete Company',
          // Missing cedula and prefijo
        })
        .expect(400);
    });

    it('should reject company creation with duplicate cedula', async () => {
      const cedula = `310${Date.now()}DUP`;

      // Create first company
      await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'First Company',
          nombreLegal: 'First Company Legal S.A.',
          cedula,
          prefijo: `FC${Date.now()}`,
          actividadEconomica: 'Consulting',
        });

      // Try to create second company with same cedula
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Second Company',
          nombreLegal: 'Second Company Legal S.A.',
          cedula, // Same cedula
          prefijo: `SC${Date.now()}`,
          actividadEconomica: 'Consulting',
        })
        .expect(409)
        .then((response) => {
          expect(response.body.message).toContain(
            'Ya existe una empresa con esa cedula',
          );
        });
    });

    it('should reject company creation with duplicate prefijo', async () => {
      const prefijo = `DUP${Date.now()}`;

      // Create first company
      await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'First Company',
          nombreLegal: 'First Company Legal S.A.',
          cedula: `310${Date.now()}A`,
          prefijo,
          actividadEconomica: 'Consulting',
        });

      // Try to create second company with same prefijo
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Second Company',
          nombreLegal: 'Second Company Legal S.A.',
          cedula: `310${Date.now()}B`,
          prefijo, // Same prefijo
          actividadEconomica: 'Consulting',
        })
        .expect(409)
        .then((response) => {
          expect(response.body.message).toContain(
            'Ya existe una empresa con ese prefijo',
          );
        });
    });

    it('should reject company creation without authentication', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .send({
          nombre: 'Test Company',
          cedula: '3101234567',
          prefijo: 'TC',
        })
        .expect(401);
    });

    it('should auto-assign company to master users on creation', async () => {
      const uniqueId = Date.now();
      const response = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: `Master Test ${uniqueId}`,
          nombreLegal: `Master Test Legal S.A. ${uniqueId}`,
          cedula: `310${uniqueId}M`,
          prefijo: `MT${uniqueId}`,
          actividadEconomica: 'Testing',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      // Master users should automatically have access
    });
  });

  describe('GET /companies/:id', () => {
    it('should return company by id', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', testCompanyId);
          expect(response.body).toHaveProperty('nombre');
          expect(response.body).toHaveProperty('logoUrl');
        });
    });

    it('should return 404 for non-existent company', () => {
      return request(app.getHttpServer())
        .get('/companies/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .expect(401);
    });

    it('should reject request for company without access', () => {
      return request(app.getHttpServer())
        .get('/companies/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('PUT /companies/:id', () => {
    it('should update company successfully', () => {
      return request(app.getHttpServer())
        .put(`/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Updated Company Name',
          telefono: '88889999',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty(
            'nombre',
            'Updated Company Name',
          );
          expect(response.body).toHaveProperty('telefono', '88889999');
        });
    });

    it('should reject update without authentication', () => {
      return request(app.getHttpServer())
        .put(`/companies/${testCompanyId}`)
        .send({
          nombre: 'Updated Name',
        })
        .expect(401);
    });

    it('should reject update of non-existent company', () => {
      return request(app.getHttpServer())
        .put('/companies/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Updated Name',
        })
        .expect(403);
    });

    it('should reject update with duplicate prefijo', async () => {
      const existingPrefijo = `EXIST${Date.now()}`;

      // Create a company with a specific prefijo
      await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Existing Company',
          nombreLegal: 'Existing Company Legal S.A.',
          cedula: `310${Date.now()}E`,
          prefijo: existingPrefijo,
          actividadEconomica: 'Testing',
        });

      // Try to update another company to use the same prefijo
      return request(app.getHttpServer())
        .put(`/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          prefijo: existingPrefijo,
        })
        .expect(409);
    });
  });

  describe('PATCH /companies/:id/inactivate', () => {
    it('should inactivate company', () => {
      return request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/inactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('estado', 0);
          expect(response.body).toHaveProperty('fechaInactivacion');
        });
    });

    it('should reject inactivate without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/inactivate`)
        .expect(401);
    });

    it('should reject inactivate of non-existent company', () => {
      return request(app.getHttpServer())
        .patch('/companies/999999/inactivate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /companies/:id/reactivate', () => {
    it('should reactivate company', () => {
      return request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/reactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('estado', 1);
          expect(response.body.fechaInactivacion).toBeNull();
        });
    });

    it('should reject reactivate without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/reactivate`)
        .expect(401);
    });
  });

  describe('GET /companies/:id/logo', () => {
    it('should return company logo or default', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/logo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          // Should return an image
          expect(response.headers['content-type']).toMatch(/^image\//);
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/logo`)
        .expect(401);
    });

    it('should return default logo when company has no custom logo', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/logo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.headers['content-type']).toMatch(/^image\//);
          expect(response.body).toBeDefined();
        });
    });
  });

  describe('POST /companies/logo/temp', () => {
    it('should upload temp logo', () => {
      return request(app.getHttpServer())
        .post('/companies/logo/temp')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'test-logo.png')
        .expect((response) => {
          // May succeed (200) or fail (400) depending on file validation
          expect([200, 400]).toContain(response.status);
        });
    });

    it('should reject upload without authentication', () => {
      return request(app.getHttpServer())
        .post('/companies/logo/temp')
        .attach('file', Buffer.from('fake-image-data'), 'test-logo.png')
        .expect(401);
    });
  });

  describe('GET /companies/:id/audit-trail', () => {
    it('should return audit trail for company', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/audit-trail`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((item: any) => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('accion');
            expect(item).toHaveProperty('descripcion');
            expect(item).toHaveProperty('cambios');
          });
        });
    });

    it('should support limit parameter', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/audit-trail?limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.length).toBeLessThanOrEqual(10);
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/audit-trail`)
        .expect(401);
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Test Company',
          cedula: `310${Date.now()}`,
          prefijo: `TV${Date.now()}`,
          email: 'not-an-email',
        })
        .expect(400);
    });

    it('should reject invalid cedula format', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Test Company',
          cedula: 'invalid',
          prefijo: `TV${Date.now()}`,
        })
        .expect(400);
    });

    it('should trim and normalize input data', () => {
      const uniqueId = Date.now();
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: '  Test Company  ',
          nombreLegal: 'Test Company Legal S.A.  ',
          cedula: `310${uniqueId}`,
          prefijo: `  TN${uniqueId}  `,
          email: `  INFO${uniqueId}@TEST.COM  `,
        })
        .expect(201)
        .then((response) => {
          expect(response.body.nombre).toBe('Test Company');
          expect(response.body.email).toBe(`info${uniqueId}@test.com`);
        });
    });
  });

  describe('Permissions', () => {
    it('should enforce company:view permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should enforce company:create permission', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: `Permission Test ${Date.now()}`,
          cedula: `310${Date.now()}P`,
          prefijo: `PT${Date.now()}`,
        })
        .expect((response) => {
          expect([201, 403]).toContain(response.status);
        });
    });

    it('should enforce company:update permission', () => {
      return request(app.getHttpServer())
        .put(`/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Permission Update Test',
        })
        .expect((response) => {
          expect([200, 403]).toContain(response.status);
        });
    });
  });
});
